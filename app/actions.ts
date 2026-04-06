"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  acceptOrganizationInviteByIdForCurrentUser,
  requireOrganizationContext,
  serializeBusinessProfile,
  serializeInvoice,
} from "@/lib/data";
import {
  canDeleteInvoice,
  canTransitionStatus,
  computeInvoiceTotals,
  deriveInvoiceStatus,
} from "@/lib/invoices/calculations";
import { formatZodError, toUserFacingError } from "@/lib/invoices/errors";
import { businessProfileSchema, invoiceSchema } from "@/lib/invoices/validation";
import { normalizeEmail } from "@/lib/organizations";
import type {
  BusinessProfileForm,
  InvoiceFormState,
  InviteAcceptanceResult,
  InvoiceStatus,
} from "@/types/domain";

const inviteEmailSchema = z.string().trim().email();

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function reserveInvoiceNumber(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
) {
  const { data, error } = await supabase.rpc("reserve_invoice_sequence");

  if (error) {
    throw new Error(error.message);
  }

  const reservation = Array.isArray(data) ? data[0] : data;

  if (!reservation) {
    throw new Error("Unable to reserve a new invoice number.");
  }

  return {
    invoiceNumber: reservation.invoice_number as string,
    sequenceNumber: reservation.sequence_number as number,
  };
}

function assertOwner(role: string) {
  if (role !== "owner") {
    throw new Error("Only organization owners can manage members.");
  }
}

export async function saveBusinessProfile(input: BusinessProfileForm) {
  let profile: BusinessProfileForm;

  try {
    profile = businessProfileSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(formatZodError(error));
    }

    throw error;
  }

  const { supabase, organization } = await requireOrganizationContext();

  const { error } = await supabase
    .from("business_profiles")
    .update(serializeBusinessProfile(profile))
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/invoices/new");
}

export async function createInvoiceDraft(input: InvoiceFormState) {
  try {
    const invoice = invoiceSchema.parse(input);
    const { supabase, organization } = await requireOrganizationContext();

    const reservation = await reserveInvoiceNumber(supabase);
    const status = deriveInvoiceStatus(
      invoice.status,
      invoice.amountPaid,
      computeInvoiceTotals(invoice).totalAmount,
    );

    const payload = {
      organization_id: organization.id,
      invoice_number: reservation.invoiceNumber,
      sequence_number: reservation.sequenceNumber,
      ...serializeInvoice({
        ...invoice,
        status,
      }),
      issued_at: status === "draft" ? null : new Date().toISOString(),
      paid_at: status === "paid" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("invoices")
      .insert(payload)
      .select("id, invoice_number")
      .single<{ id: string; invoice_number: string }>();

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");

    return {
      ok: true,
      data: {
        id: data.id,
        invoiceNumber: data.invoice_number,
      },
    } satisfies ActionResult<{ id: string; invoiceNumber: string }>;
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error).message,
    } satisfies ActionResult<{ id: string; invoiceNumber: string }>;
  }
}

export async function updateInvoice(input: InvoiceFormState & { id: string }) {
  try {
    const invoice = invoiceSchema.extend({ id: invoiceSchema.shape.id.unwrap() }).parse(input);
    const { supabase, organization } = await requireOrganizationContext();

    const { data: existing, error: existingError } = await supabase
      .from("invoices")
      .select("status, issued_at, paid_at")
      .eq("organization_id", organization.id)
      .eq("id", invoice.id)
      .single<{ status: InvoiceStatus; issued_at: string | null; paid_at: string | null }>();

    if (existingError) {
      throw new Error(existingError.message);
    }

    const totals = computeInvoiceTotals(invoice);
    const status = deriveInvoiceStatus(invoice.status, invoice.amountPaid, totals.totalAmount);

    const { error } = await supabase
      .from("invoices")
      .update({
        ...serializeInvoice({
          ...invoice,
          status,
        }),
        issued_at:
          existing.issued_at ?? (status === "draft" ? null : new Date().toISOString()),
        paid_at: status === "paid" ? existing.paid_at ?? new Date().toISOString() : null,
      })
      .eq("organization_id", organization.id)
      .eq("id", invoice.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");
    revalidatePath(`/invoices/${invoice.id}`);
    revalidatePath(`/invoices/${invoice.id}/print`);

    return {
      ok: true,
      data: null,
    } satisfies ActionResult<null>;
  } catch (error) {
    return {
      ok: false,
      error: toUserFacingError(error).message,
    } satisfies ActionResult<null>;
  }
}

export async function duplicateInvoice(id: string) {
  const { supabase, organization } = await requireOrganizationContext();
  const { data: source, error: sourceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  const reservation = await reserveInvoiceNumber(supabase);
  const cloned = {
    ...source,
    id: undefined,
    organization_id: organization.id,
    invoice_number: reservation.invoiceNumber,
    sequence_number: reservation.sequenceNumber,
    status: "draft",
    amount_paid: 0,
    balance_due: source.total_amount,
    issued_at: null,
    paid_at: null,
    created_at: undefined,
    updated_at: undefined,
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(cloned)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");

  return {
    id: data.id,
  };
}

export async function transitionInvoiceStatus(id: string, nextStatus: InvoiceStatus) {
  const { supabase, organization } = await requireOrganizationContext();
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("status, amount_paid, total_amount")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single<{ status: InvoiceStatus; amount_paid: string | number; total_amount: string | number }>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!canTransitionStatus(existing.status, nextStatus)) {
    throw new Error(`Cannot move invoice from ${existing.status} to ${nextStatus}.`);
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: deriveInvoiceStatus(nextStatus, Number(existing.amount_paid), Number(existing.total_amount)),
      issued_at: nextStatus === "draft" ? null : new Date().toISOString(),
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("organization_id", organization.id)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${id}`);
}

export async function toggleInvoicePaidState(id: string, nextStatus: "issued" | "paid") {
  const { supabase, organization } = await requireOrganizationContext();
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("status, total_amount, issued_at")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single<{ status: InvoiceStatus; total_amount: string | number; issued_at: string | null }>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!["issued", "paid"].includes(existing.status)) {
    throw new Error("Only issued or paid invoices can be toggled from the dashboard.");
  }

  const totalAmount = Number(existing.total_amount);
  const nextAmountPaid = nextStatus === "paid" ? totalAmount : 0;
  const nextBalanceDue = nextStatus === "paid" ? 0 : totalAmount;

  const { error } = await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      amount_paid: nextAmountPaid,
      balance_due: nextBalanceDue,
      issued_at: existing.issued_at ?? new Date().toISOString(),
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("organization_id", organization.id)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${id}`);
  revalidatePath(`/invoices/${id}/print`);
}

export async function recordPayment(id: string, amount: number) {
  const { supabase, organization } = await requireOrganizationContext();
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("amount_paid, total_amount")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single<{ amount_paid: string | number; total_amount: string | number }>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const nextPaid = Number(existing.amount_paid) + amount;
  const totalAmount = Number(existing.total_amount);
  const status = deriveInvoiceStatus("issued", nextPaid, totalAmount);

  const { error } = await supabase
    .from("invoices")
    .update({
      amount_paid: nextPaid,
      balance_due: Math.max(totalAmount - nextPaid, 0),
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("organization_id", organization.id)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteDraftInvoice(id: string) {
  const { supabase, organization } = await requireOrganizationContext();
  const { data, error: fetchError } = await supabase
    .from("invoices")
    .select("status")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single<{ status: InvoiceStatus }>();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!canDeleteInvoice(data.status)) {
    throw new Error("Only draft invoices can be deleted.");
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("organization_id", organization.id)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function inviteOrganizationMember(email: string) {
  const normalizedEmail = normalizeEmail(inviteEmailSchema.parse(email));
  const { supabase, organization, membership, user } = await requireOrganizationContext();
  assertOwner(membership.role);

  const { data: activeMember, error: memberLookupError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("email", normalizedEmail)
    .eq("status", "active")
    .maybeSingle();

  if (memberLookupError) {
    throw new Error(memberLookupError.message);
  }

  if (activeMember) {
    throw new Error("That email already belongs to this organization.");
  }

  const { data: existingInvite, error: inviteLookupError } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle<{
      id: string;
      expires_at: string;
      status: "pending";
    }>();

  if (inviteLookupError) {
    throw new Error(inviteLookupError.message);
  }

  if (existingInvite) {
    if (new Date(existingInvite.expires_at).getTime() > Date.now()) {
      return {
        id: existingInvite.id,
        email: normalizedEmail,
        expiresAt: existingInvite.expires_at,
      };
    }

    await supabase
      .from("organization_invites")
      .update({ status: "expired" })
      .eq("id", existingInvite.id);
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("organization_invites")
    .insert({
      organization_id: organization.id,
      invited_by_user_id: user.id,
      email: normalizedEmail,
      expires_at: expiresAt,
      status: "pending",
    })
    .select("id, expires_at")
    .single<{ id: string; expires_at: string }>();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");

  return {
    id: data.id,
    email: normalizedEmail,
    expiresAt: data.expires_at,
  };
}

export async function revokeOrganizationInvite(inviteId: string) {
  const { supabase, organization, membership } = await requireOrganizationContext();
  assertOwner(membership.role);

  const { error } = await supabase
    .from("organization_invites")
    .update({ status: "revoked" })
    .eq("organization_id", organization.id)
    .eq("id", inviteId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function removeOrganizationMember(memberId: string) {
  const { supabase, organization, membership } = await requireOrganizationContext();
  assertOwner(membership.role);

  const { data: target, error: fetchError } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", organization.id)
    .eq("id", memberId)
    .single<{ id: string; role: "owner" | "member" }>();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (target.role === "owner") {
    throw new Error("The organization owner cannot be removed.");
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ status: "removed" })
    .eq("organization_id", organization.id)
    .eq("id", memberId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function acceptOrganizationInvite(
  inviteId: string,
): Promise<InviteAcceptanceResult> {
  const result = await acceptOrganizationInviteByIdForCurrentUser(inviteId);

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/join");
    revalidatePath("/settings");
  }

  return result;
}
