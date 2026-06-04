import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { requireUser } from "@/lib/auth";
import { normalizeEmail } from "@/lib/organizations";
import { ensureBusinessProfileForOrganization } from "@/lib/business-profiles/data";
import type {
  Organization,
  OrganizationContext,
  OrganizationInvite,
  OrganizationMember,
  PendingOrganizationInvite,
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

type AcceptOrganizationInviteRpcRow = {
  ok: boolean;
  reason:
    | "invalid"
    | "expired"
    | "revoked"
    | "accepted"
    | "already_member"
    | "email_mismatch"
    | null;
  organization_id: string | null;
  invited_email: string | null;
};

function isDuplicateKeyError(error: { code?: string; message: string } | null) {
  return error?.code === "23505" || error?.message.includes("duplicate key value");
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

async function bootstrapOrganizationForUser(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: User,
) {
  const normalizedEmail = normalizeEmail(user.email ?? "");
  const emptyCompanyProfile = {
    companyName: "My Business",
    email: user.email ?? "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
    businessNumber: "",
    taxRegistrations: [],
    invoicePrefix: "INV",
    nextInvoiceSequence: 1,
    defaultCurrency: "CAD" as const,
    defaultPaymentMethods: [],
    defaultNotes: "",
  };

  const { error: organizationError } = await supabase
    .from("organizations")
    .insert({
      id: user.id,
      owner_user_id: user.id,
      name: emptyCompanyProfile.companyName,
    });

  if (organizationError && !isDuplicateKeyError(organizationError)) {
    throw new Error(organizationError.message);
  }

  const { error: membershipError } = await supabase.from("organization_members").insert({
    organization_id: user.id,
    user_id: user.id,
    email: normalizedEmail,
    role: "owner",
    status: "active",
  });

  if (membershipError && !isDuplicateKeyError(membershipError)) {
    throw new Error(membershipError.message);
  }
}

export const getOrganizationContextForUser = cache(async function getOrganizationContextForUser(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: User,
): Promise<OrganizationContext | null> {
  await expireStalePendingInvitesForEmail(supabase, user.email ?? "");
  const membership = await getActiveMembershipForUserId(supabase, user.id);

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
});

export const ensureOrganizationContextForUser = cache(async function ensureOrganizationContextForUser(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: User,
): Promise<OrganizationContext | null> {
  let context = await getOrganizationContextForUser(supabase, user);

  if (context) {
    return context;
  }

  const [hasAnyMembership, pendingInvites] = await Promise.all([
    getAnyMembershipForUserId(supabase, user.id),
    getPendingInvitesForEmail(supabase, user.email ?? ""),
  ]);

  if (!hasAnyMembership && pendingInvites.length === 0) {
    await bootstrapOrganizationForUser(supabase, user);
    context = await getOrganizationContextForUser(supabase, user);
  }

  return context;
});

export async function requireOrganizationContext() {
  const { supabase, user } = await requireUser();
  const context = await getOrganizationContextForUser(supabase, user);

  if (!context) {
    const pendingInvites = await getPendingInvitesForEmail(supabase, user.email ?? "");
    redirect(pendingInvites.length > 0 ? "/workspaces" : "/login");
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

export async function acceptOrganizationInviteByIdForCurrentUser(
  inviteId: string,
): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; reason: "missing_token" | "invalid" | "expired" | "revoked" | "accepted" | "already_member" }
  | { ok: false; reason: "email_mismatch"; invitedEmail: string }
> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc(
    "accept_organization_invite_for_current_user",
    {
      invite_id: inviteId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = (Array.isArray(data) ? data[0] : data) as AcceptOrganizationInviteRpcRow | null;

  if (!result) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  if (result.ok && result.organization_id) {
    return {
      ok: true,
      organizationId: result.organization_id,
    };
  }

  if (result.reason === "email_mismatch") {
    return {
      ok: false,
      reason: "email_mismatch",
      invitedEmail: result.invited_email ?? "",
    };
  }

  if (
    result.reason === "already_member" ||
    result.reason === "accepted" ||
    result.reason === "expired" ||
    result.reason === "invalid" ||
    result.reason === "revoked"
  ) {
    return {
      ok: false,
      reason: result.reason,
    };
  }

  return {
    ok: false,
    reason: "invalid",
  };
}

export async function getSettingsSnapshot() {
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
