import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { normalizeEmail, isInviteExpired } from "@/lib/organizations";
import { computeInvoiceTotals } from "@/lib/invoices/calculations";
import { EMPTY_COMPANY_PROFILE } from "@/lib/invoices/constants";
import {
  createDuplicateInvoice,
  createEmptyInvoice,
  normalizePaymentInstruction,
} from "@/lib/invoices/defaults";
import type {
  BillTo,
  BusinessProfileForm,
  DashboardSnapshot,
  InviteAcceptanceResult,
  InvoiceFormState,
  InvoiceRecord,
  Organization,
  OrganizationContext,
  OrganizationInvite,
  OrganizationMember,
  PendingOrganizationInvite,
  PaymentInstruction,
  SettingsSnapshot,
  TaxLine,
  TaxRegistration,
} from "@/types/domain";

type OrganizationRow = {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  role: "owner" | "member";
  status: "active" | "removed";
  created_at: string;
};

type OrganizationInviteRow = {
  id: string;
  organization_id: string;
  invited_by_user_id: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
};

type PendingOrganizationInviteRow = OrganizationInviteRow & {
  organization_name: string | null;
};

type BusinessProfileRow = {
  organization_id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  business_number: string | null;
  tax_registrations: unknown;
  invoice_prefix: string;
  next_invoice_sequence: number;
  default_currency: "CAD" | "USD";
  default_payment_methods: unknown;
  default_notes: string | null;
  logo_path: string | null;
};

type InvoiceRow = {
  id: string;
  organization_id: string;
  invoice_number: string;
  sequence_number: number;
  status: InvoiceRecord["status"];
  currency_code: InvoiceRecord["currencyCode"];
  issue_date: string;
  due_date: string;
  project_reference: string | null;
  bill_to: unknown;
  company_snapshot: unknown;
  line_items: unknown;
  tax_lines: unknown;
  payment_methods: unknown;
  notes: string | null;
  amount_paid: string | number;
  subtotal_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  balance_due: string | number;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function asPaymentInstructions(value: unknown) {
  return asArray<Partial<PaymentInstruction> & Pick<PaymentInstruction, "id" | "label">>(value).map(
    (method) => normalizePaymentInstruction(method),
  );
}

function mapOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrganizationMemberRow(row: OrganizationMemberRow): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapOrganizationInviteRow(row: OrganizationInviteRow): OrganizationInvite {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invitedByUserId: row.invited_by_user_id,
    email: row.email,
    token: row.token,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedByUserId: row.accepted_by_user_id,
    createdAt: row.created_at,
  };
}

function mapPendingOrganizationInviteRow(
  row: PendingOrganizationInviteRow,
): PendingOrganizationInvite {
  return {
    ...mapOrganizationInviteRow(row),
    organizationName: row.organization_name?.trim() || "Workspace",
  };
}

async function getSignedLogoUrl(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  path?: string | null,
) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("branding-assets")
    .createSignedUrl(path, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function mapBusinessProfileRow(
  row: BusinessProfileRow,
  logoUrl: string | null,
): BusinessProfileForm {
  return {
    companyName: row.company_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    address1: row.address1 ?? "",
    address2: row.address2 ?? "",
    city: row.city ?? "",
    province: row.province ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "Canada",
    businessNumber: row.business_number ?? "",
    taxRegistrations: asArray<TaxRegistration>(row.tax_registrations),
    invoicePrefix: row.invoice_prefix,
    nextInvoiceSequence: row.next_invoice_sequence,
    defaultCurrency: row.default_currency,
    defaultPaymentMethods: asPaymentInstructions(row.default_payment_methods),
    defaultNotes: row.default_notes ?? "",
    logoPath: row.logo_path,
    logoUrl,
  };
}

async function mapInvoiceRow(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  row: InvoiceRow,
) {
  const companySnapshot = row.company_snapshot as InvoiceRecord["companySnapshot"];
  const logoUrl = await getSignedLogoUrl(supabase, companySnapshot?.logoPath ?? null);

  const record: InvoiceRecord = {
    id: row.id,
    invoiceNumber: row.invoice_number,
    sequenceNumber: row.sequence_number,
    status: row.status,
    currencyCode: row.currency_code,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    projectReference: row.project_reference ?? "",
    billTo: row.bill_to as BillTo,
    companySnapshot: {
      ...(companySnapshot ?? {}),
      taxRegistrations: asArray<TaxRegistration>(companySnapshot?.taxRegistrations),
      logoUrl,
    },
    lineItems: asArray<InvoiceRecord["lineItems"][number]>(row.line_items),
    taxLines: asArray<TaxLine>(row.tax_lines),
    paymentMethods: asPaymentInstructions(row.payment_methods),
    notes: row.notes ?? "",
    amountPaid: asNumber(row.amount_paid),
    subtotalAmount: asNumber(row.subtotal_amount),
    taxAmount: asNumber(row.tax_amount),
    totalAmount: asNumber(row.total_amount),
    balanceDue: asNumber(row.balance_due),
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return record;
}

export function serializeBusinessProfile(profile: BusinessProfileForm) {
  return {
    company_name: profile.companyName,
    email: profile.email || null,
    phone: profile.phone || null,
    address1: profile.address1 || null,
    address2: profile.address2 || null,
    city: profile.city || null,
    province: profile.province || null,
    postal_code: profile.postalCode || null,
    country: profile.country || "Canada",
    business_number: profile.businessNumber || null,
    tax_registrations: profile.taxRegistrations,
    invoice_prefix: profile.invoicePrefix.trim().toUpperCase(),
    next_invoice_sequence: profile.nextInvoiceSequence,
    default_currency: profile.defaultCurrency,
    default_payment_methods: profile.defaultPaymentMethods,
    default_notes: profile.defaultNotes,
    logo_path: profile.logoPath ?? null,
  };
}

export function serializeInvoice(invoice: InvoiceFormState | InvoiceRecord) {
  const totals = computeInvoiceTotals(invoice);

  return {
    status: invoice.status,
    currency_code: invoice.currencyCode,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    project_reference: invoice.projectReference || null,
    bill_to: invoice.billTo,
    company_snapshot: {
      ...invoice.companySnapshot,
      logoUrl: null,
    },
    line_items: invoice.lineItems,
    tax_lines: invoice.taxLines,
    payment_methods: invoice.paymentMethods,
    notes: invoice.notes,
    amount_paid: invoice.amountPaid,
    subtotal_amount: totals.subtotalAmount,
    tax_amount: totals.taxAmount,
    total_amount: totals.totalAmount,
    balance_due: totals.balanceDue,
  };
}

async function getOrganizationById(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single<OrganizationRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapOrganizationRow(data);
}

async function getActiveMembershipForUserId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle<OrganizationMemberRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapOrganizationMemberRow(data) : null;
}

async function getAnyMembershipForUserId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

async function getPendingInvitesForEmail(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  email: string,
) {
  const { data, error } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("email", normalizeEmail(email))
    .eq("status", "pending")
    .returns<OrganizationInviteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapOrganizationInviteRow);
}

async function expireStalePendingInvitesForEmail(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  email: string,
) {
  if (!email) {
    return;
  }

  const { error } = await supabase
    .from("organization_invites")
    .update({ status: "expired" })
    .eq("email", normalizeEmail(email))
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString());

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureBusinessProfileForOrganization(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  organizationId: string,
  fallbackEmail: string,
) {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle<BusinessProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return mapBusinessProfileRow(data, await getSignedLogoUrl(supabase, data.logo_path));
  }

  const empty = EMPTY_COMPANY_PROFILE(fallbackEmail);
  const { data: inserted, error: insertError } = await supabase
    .from("business_profiles")
    .insert({
      organization_id: organizationId,
      ...serializeBusinessProfile(empty),
    })
    .select("*")
    .single<BusinessProfileRow>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return mapBusinessProfileRow(
    inserted,
    await getSignedLogoUrl(supabase, inserted.logo_path),
  );
}

async function bootstrapOrganizationForUser(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: User,
) {
  const normalizedEmail = normalizeEmail(user.email ?? "");
  const empty = EMPTY_COMPANY_PROFILE(user.email ?? "");

  const { error: organizationError } = await supabase
    .from("organizations")
    .upsert({
      id: user.id,
      owner_user_id: user.id,
      name: empty.companyName,
    });

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  const { error: membershipError } = await supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: user.id,
        user_id: user.id,
        email: normalizedEmail,
        role: "owner",
        status: "active",
      },
      {
        onConflict: "organization_id,user_id",
      },
    );

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { error: profileError } = await supabase
    .from("business_profiles")
    .upsert({
      organization_id: user.id,
      ...serializeBusinessProfile(empty),
    });

  if (profileError) {
    throw new Error(profileError.message);
  }
}

export async function ensureOrganizationContextForUser(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: User,
): Promise<OrganizationContext | null> {
  await expireStalePendingInvitesForEmail(supabase, user.email ?? "");

  let membership = await getActiveMembershipForUserId(supabase, user.id);

  if (!membership) {
    const [hasAnyMembership, pendingInvites] = await Promise.all([
      getAnyMembershipForUserId(supabase, user.id),
      getPendingInvitesForEmail(supabase, user.email ?? ""),
    ]);

    if (!hasAnyMembership && pendingInvites.length === 0) {
      await bootstrapOrganizationForUser(supabase, user);
      membership = await getActiveMembershipForUserId(supabase, user.id);
    }
  }

  if (!membership) {
    return null;
  }

  const organization = await getOrganizationById(supabase, membership.organizationId);
  const profile = await ensureBusinessProfileForOrganization(
    supabase,
    organization.id,
    user.email ?? "",
  );

  return {
    organization,
    membership,
    profile,
  };
}

export async function requireOrganizationContext() {
  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (!context) {
    const pendingInvites = await getPendingInvitesForEmail(supabase, user.email ?? "");
    redirect(pendingInvites.length > 0 ? "/join" : "/login");
  }

  return {
    supabase,
    user,
    ...context,
  };
}

export async function getPendingInvitesForCurrentUser() {
  const { supabase, user } = await requireUser();
  await expireStalePendingInvitesForEmail(supabase, user.email ?? "");

  const { data, error } = await supabase.rpc("get_pending_invites_for_current_user");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PendingOrganizationInviteRow[]).map(
    mapPendingOrganizationInviteRow,
  );
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const { supabase, organization, profile } = await requireOrganizationContext();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .returns<InvoiceRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const invoices = await Promise.all(
    (data ?? []).map((invoice) => mapInvoiceRow(supabase, invoice)),
  );

  return {
    profile,
    invoices,
  };
}

export async function getBusinessProfileForCurrentUser() {
  const { profile } = await requireOrganizationContext();
  return profile;
}

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const { supabase, organization, membership, profile } = await requireOrganizationContext();

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true })
      .returns<OrganizationMemberRow[]>(),
    supabase
      .from("organization_invites")
      .select("*")
      .eq("organization_id", organization.id)
      .neq("status", "accepted")
      .order("created_at", { ascending: false })
      .returns<OrganizationInviteRow[]>(),
  ]);

  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  if (invitesResult.error) {
    throw new Error(invitesResult.error.message);
  }

  return {
    organization,
    membership,
    profile,
    members: (membersResult.data ?? []).map(mapOrganizationMemberRow),
    invites: (invitesResult.data ?? []).map(mapOrganizationInviteRow),
  };
}

export async function getInvoiceById(id: string) {
  const { supabase, organization } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .maybeSingle<InvoiceRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return mapInvoiceRow(supabase, data);
}

export async function getNewInvoiceSeed(duplicateId?: string) {
  const { supabase, organization, profile } = await requireOrganizationContext();

  if (!duplicateId) {
    return {
      profile,
      invoice: createEmptyInvoice(profile),
    };
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", duplicateId)
    .maybeSingle<InvoiceRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const source = await mapInvoiceRow(supabase, data);

  return {
    profile,
    invoice: createDuplicateInvoice(source),
  };
}

export async function acceptOrganizationInviteByIdForCurrentUser(
  inviteId: string,
): Promise<InviteAcceptanceResult> {
  const { supabase, user } = await requireUser();
  const normalizedUserEmail = normalizeEmail(user.email ?? "");

  const activeMembership = await getActiveMembershipForUserId(supabase, user.id);

  if (activeMembership) {
    return {
      ok: false,
      reason: "already_member",
    };
  }

  const { data: inviteRow, error } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("id", inviteId)
    .maybeSingle<OrganizationInviteRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!inviteRow) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  const invite = mapOrganizationInviteRow(inviteRow);

  if (invite.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }

  if (invite.status === "accepted") {
    return { ok: false, reason: "accepted" };
  }

  if (invite.status === "expired") {
    return { ok: false, reason: "expired" };
  }

  if (normalizeEmail(invite.email) !== normalizedUserEmail) {
    return {
      ok: false,
      reason: "email_mismatch",
      invitedEmail: invite.email,
    };
  }

  if (isInviteExpired(invite.expiresAt)) {
    await supabase
      .from("organization_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);

    return {
      ok: false,
      reason: "expired",
    };
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", invite.organizationId)
    .eq("user_id", user.id)
    .maybeSingle<OrganizationMemberRow>();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (existingMembership) {
    const { error: reactivateError } = await supabase
      .from("organization_members")
      .update({
        email: normalizedUserEmail,
        role: "member",
        status: "active",
      })
      .eq("id", existingMembership.id);

    if (reactivateError) {
      throw new Error(reactivateError.message);
    }
  } else {
    const { error: insertError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: invite.organizationId,
        user_id: user.id,
        email: normalizedUserEmail,
        role: "member",
        status: "active",
      });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { error: acceptError } = await supabase
    .from("organization_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: user.id,
    })
    .eq("id", invite.id);

  if (acceptError) {
    throw new Error(acceptError.message);
  }

  await ensureBusinessProfileForOrganization(
    supabase,
    invite.organizationId,
    user.email ?? "",
  );

  return {
    ok: true,
    organizationId: invite.organizationId,
  };
}
