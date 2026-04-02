"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireUser } from "@/lib/auth";
import { computeInvoiceTotals, canDeleteInvoice, canTransitionStatus, deriveInvoiceStatus } from "@/lib/invoices/calculations";
import { formatZodError } from "@/lib/invoices/errors";
import { businessProfileSchema, invoiceSchema } from "@/lib/invoices/validation";
import { ensureBusinessProfileForUser, serializeBusinessProfile, serializeInvoice } from "@/lib/data";
import type { BusinessProfileForm, InvoiceFormState, InvoiceStatus } from "@/types/domain";

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

  const { supabase, user } = await requireUser();
  await ensureBusinessProfileForUser(supabase, user);

  const { error } = await supabase
    .from("business_profiles")
    .update(serializeBusinessProfile(profile))
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/invoices/new");

  return {
    ok: true,
  };
}

export async function createInvoiceDraft(input: InvoiceFormState) {
  let invoice: InvoiceFormState;

  try {
    invoice = invoiceSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(formatZodError(error));
    }

    throw error;
  }

  const { supabase, user } = await requireUser();

  const reservation = await reserveInvoiceNumber(supabase);
  const status = deriveInvoiceStatus(
    invoice.status,
    invoice.amountPaid,
    computeInvoiceTotals(invoice).totalAmount,
  );

  const payload = {
    user_id: user.id,
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
    id: data.id,
    invoiceNumber: data.invoice_number,
  };
}

export async function updateInvoice(input: InvoiceFormState & { id: string }) {
  let invoice: InvoiceFormState & { id: string };

  try {
    invoice = invoiceSchema.extend({ id: invoiceSchema.shape.id.unwrap() }).parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(formatZodError(error));
    }

    throw error;
  }

  const { supabase } = await requireUser();

  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("status, issued_at, paid_at")
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
      paid_at:
        status === "paid"
          ? existing.paid_at ?? new Date().toISOString()
          : null,
    })
    .eq("id", invoice.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath(`/invoices/${invoice.id}/print`);

  return {
    id: invoice.id,
  };
}

export async function duplicateInvoice(id: string) {
  const { supabase, user } = await requireUser();
  const { data: source, error: sourceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  const reservation = await reserveInvoiceNumber(supabase);
  const cloned = {
    ...source,
    id: undefined,
    user_id: user.id,
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
  const { supabase } = await requireUser();
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("status, amount_paid, total_amount")
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
      issued_at:
        nextStatus === "draft" ? null : new Date().toISOString(),
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${id}`);
}

export async function recordPayment(id: string, amount: number) {
  const { supabase } = await requireUser();
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("amount_paid, total_amount")
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
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteDraftInvoice(id: string) {
  const { supabase } = await requireUser();
  const { data, error: fetchError } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single<{ status: InvoiceStatus }>();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!canDeleteInvoice(data.status)) {
    throw new Error("Only draft invoices can be deleted.");
  }

  const { error } = await supabase.from("invoices").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}
