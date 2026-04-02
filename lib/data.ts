import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { computeInvoiceTotals } from "@/lib/invoices/calculations";
import { EMPTY_COMPANY_PROFILE } from "@/lib/invoices/constants";
import { createDuplicateInvoice, createEmptyInvoice } from "@/lib/invoices/defaults";
import type {
  BillTo,
  BusinessProfileForm,
  DashboardSnapshot,
  InvoiceFormState,
  InvoiceRecord,
  PaymentInstruction,
  TaxLine,
  TaxRegistration,
} from "@/types/domain";

type BusinessProfileRow = {
  user_id: string;
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
  user_id: string;
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
    defaultPaymentMethods: asArray<PaymentInstruction>(row.default_payment_methods),
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
    paymentMethods: asArray<PaymentInstruction>(row.payment_methods),
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

export async function ensureBusinessProfileForUser(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: User,
) {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<BusinessProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return mapBusinessProfileRow(data, await getSignedLogoUrl(supabase, data.logo_path));
  }

  const empty = EMPTY_COMPANY_PROFILE(user.email ?? "");
  const { data: inserted, error: insertError } = await supabase
    .from("business_profiles")
    .insert({
      user_id: user.id,
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

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const { supabase, user } = await requireUser();
  const profile = await ensureBusinessProfileForUser(supabase, user);

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
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
  const { supabase, user } = await requireUser();
  return ensureBusinessProfileForUser(supabase, user);
}

export async function getInvoiceById(id: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
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
  const { supabase, user } = await requireUser();
  const profile = await ensureBusinessProfileForUser(supabase, user);

  if (!duplicateId) {
    return {
      profile,
      invoice: createEmptyInvoice(profile),
    };
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
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
