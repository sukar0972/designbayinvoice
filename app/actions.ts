"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { serializeBusinessProfile } from "@/lib/business-profiles/data";
import {
  acceptOrganizationInviteByIdForCurrentUser,
  getOrganizationContextForUser,
  requireOrganizationContext,
} from "@/lib/organizations/data";
import { serializeInvoice } from "@/lib/invoices/data";
import { getInvoiceById } from "@/lib/invoices/data";
import {
  canDeleteInvoice,
  canTransitionStatus,
} from "@/lib/invoices/calculations";
import {
  buildCreatePayload,
  buildDuplicatePayload,
  buildRecordPaymentPayload,
  buildStatusTransitionPayload,
  buildTogglePaidPayload,
  buildUpdatePayload,
} from "@/lib/invoices/mutations";
import { formatZodError, toUserFacingError } from "@/lib/invoices/errors";
import {
  businessProfileSchema,
  invoiceSchema,
  recordPaymentAmountSchema,
} from "@/lib/invoices/validation";
import { detectLogoImage } from "@/lib/images";
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

type LeaveWorkspaceRpcRow = {
  ok: boolean;
  reason: "not_member" | "last_owner" | "workspace_deleted" | null;
  organization_id: string | null;
  transferred_owner_email: string | null;
};

const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

async function deleteBrandingAssetsForOrganization(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  organizationId: string,
) {
  const bucket = supabase.storage.from("branding-assets");
  const folder = `${organizationId}/logo`;
  const pathsToRemove: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(folder, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Could not load branding assets for deletion: ${error.message}`);
    }

    const page = data ?? [];

    pathsToRemove.push(
      ...page
        .filter((entry) => entry.id !== null)
        .map((entry) => `${folder}/${entry.name}`),
    );

    if (page.length < 100) {
      break;
    }

    offset += 100;
  }

  if (pathsToRemove.length === 0) {
    return;
  }

  const { error } = await bucket.remove(pathsToRemove);

  if (error) {
    throw new Error(`Could not delete branding assets: ${error.message}`);
  }
}

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

export async function uploadLogo(formData: FormData) {
  const file = formData.get("logo") as File | null;

  if (!file) {
    return { ok: false, error: "No file provided." } as ActionResult<{ path: string; signedUrl: string }>;
  }

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { ok: false, error: "Invalid logo format. Use PNG, JPG, or WebP." } as ActionResult<{ path: string; signedUrl: string }>;
  }

  if (file.size > MAX_LOGO_FILE_SIZE) {
    return { ok: false, error: "Logo file is too large. Maximum size is 2 MB." } as ActionResult<{ path: string; signedUrl: string }>;
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const detectedImage = detectLogoImage(fileBytes);

  if (!detectedImage) {
    return { ok: false, error: "Invalid logo file. Upload a valid PNG, JPG, or WebP image." } as ActionResult<{ path: string; signedUrl: string }>;
  }

  if (detectedImage.mimeType !== file.type) {
    return { ok: false, error: "Logo file type does not match the uploaded image data." } as ActionResult<{ path: string; signedUrl: string }>;
  }

  const { supabase, organization, profile } = await requireOrganizationContext();

  const path = `${organization.id}/logo/${crypto.randomUUID()}.${detectedImage.extension}`;
  const verifiedFile = new Blob([fileBytes], { type: detectedImage.mimeType });

  const { error: uploadError } = await supabase.storage
    .from("branding-assets")
    .upload(path, verifiedFile, { upsert: true, contentType: detectedImage.mimeType });

  if (uploadError) {
    return { ok: false, error: uploadError.message } as ActionResult<{ path: string; signedUrl: string }>;
  }

  const { data } = await supabase.storage
    .from("branding-assets")
    .createSignedUrl(path, 60 * 60);

  const signedUrl = data?.signedUrl ?? null;

  // Remove old logo if present
  if (profile.logoPath) {
    await supabase.storage.from("branding-assets").remove([profile.logoPath]);
  }

  return {
    ok: true,
    data: { path, signedUrl: signedUrl ?? "" },
  } as ActionResult<{ path: string; signedUrl: string }>;
}

export async function createInvoiceDraft(input: InvoiceFormState) {
  try {
    const invoice = invoiceSchema.parse(input);
    const { supabase, organization } = await requireOrganizationContext();

    const reservation = await reserveInvoiceNumber(supabase);
    const mutation = buildCreatePayload(invoice, reservation);

    const payload = {
      organization_id: organization.id,
      ...serializeInvoice(invoice),
      ...mutation,
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
    const invoice = invoiceSchema.safeExtend({ id: invoiceSchema.shape.id.unwrap() }).parse(input);
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

    const mutation = buildUpdatePayload(invoice, existing);

    const { error } = await supabase
      .from("invoices")
      .update({
        ...serializeInvoice(invoice),
        ...mutation,
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

  const source = await getInvoiceById(id);
  const reservation = await reserveInvoiceNumber(supabase);

  const duplicate = buildDuplicatePayload(source, reservation);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      ...serializeInvoice(duplicate),
      invoice_number: reservation.invoiceNumber,
      sequence_number: reservation.sequenceNumber,
      issued_at: null,
      paid_at: null,
    })
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

  const mutation = buildStatusTransitionPayload(nextStatus, existing);

  const { error } = await supabase
    .from("invoices")
    .update(mutation)
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

  const mutation = buildTogglePaidPayload(nextStatus, existing);

  const { error } = await supabase
    .from("invoices")
    .update(mutation)
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
  const paymentAmount = recordPaymentAmountSchema.parse(amount);
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

  const amountPaid = Number(existing.amount_paid);
  const totalAmount = Number(existing.total_amount);
  const balanceDue = totalAmount - amountPaid;

  if (!Number.isFinite(amountPaid) || !Number.isFinite(totalAmount)) {
    throw new Error("Invoice payment totals are invalid.");
  }

  if (paymentAmount > balanceDue) {
    throw new Error("Payment amount cannot exceed the remaining balance.");
  }

  const mutation = buildRecordPaymentPayload(paymentAmount, existing);

  const { error } = await supabase
    .from("invoices")
    .update(mutation)
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

export async function leaveCurrentWorkspace(
  options?: { destroyWorkspace?: boolean },
): Promise<
  | ({ ok: true; data: { transferredOwnershipToEmail: string | null } })
  | ({ ok: false; error: string; requiresWorkspaceDeletionConfirmation?: boolean })
> {
  const { supabase, user } = await requireUser();

  if (options?.destroyWorkspace) {
    const context = await getOrganizationContextForUser(supabase, user);

    if (!context) {
      return {
        ok: false,
        error: "You are not currently an active member of a workspace.",
      };
    }

    await deleteBrandingAssetsForOrganization(supabase, context.organization.id);
  }

  const { data, error } = await supabase.rpc("leave_current_workspace", {
    confirm_destroy: options?.destroyWorkspace ?? false,
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  const result = (Array.isArray(data) ? data[0] : data) as LeaveWorkspaceRpcRow | null;

  if (!result) {
    return {
      ok: false,
      error: "Unable to leave the current workspace.",
    };
  }

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    revalidatePath("/workspaces");

    return {
      ok: true,
      data: {
        transferredOwnershipToEmail: result.transferred_owner_email,
      },
    };
  }

  if (result.reason === "last_owner") {
    return {
      ok: false,
      error:
        "You are the only active member in this workspace. Leaving will permanently delete the workspace and all of its invoices, settings, invites, and billing profile.",
      requiresWorkspaceDeletionConfirmation: true,
    };
  }

  return {
    ok: false,
    error: "You are not currently an active member of a workspace.",
  };
}
