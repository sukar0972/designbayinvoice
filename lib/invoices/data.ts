import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { computeInvoiceTotals } from "@/lib/invoices/calculations";
import {
  createDuplicateInvoice,
  createEmptyInvoice,
} from "@/lib/invoices/defaults";
import { requireOrganizationContext } from "@/lib/organizations/data";
import { getSignedLogoUrl } from "@/lib/business-profiles/data";
import type {
  BillTo,
  DashboardSnapshot,
  InvoiceRecord,
  InvoiceStatus,
  TaxLine,
  TaxRegistration,
} from "@/types/domain";

type InvoiceRow = {
  id: string;
  organization_id: string;
  invoice_number: string;
  sequence_number: number;
  status: InvoiceStatus;
  currency_code: "CAD" | "USD";
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

type DashboardInvoiceRow = Pick<
  InvoiceRow,
  | "id"
  | "invoice_number"
  | "sequence_number"
  | "status"
  | "currency_code"
  | "issue_date"
  | "due_date"
  | "project_reference"
  | "bill_to"
  | "amount_paid"
  | "subtotal_amount"
  | "tax_amount"
  | "total_amount"
  | "balance_due"
  | "issued_at"
  | "paid_at"
  | "created_at"
  | "updated_at"
>;

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function asPaymentInstructions(value: unknown) {
  return asArray<{
    id: string;
    label: string;
    details?: string;
    preferred?: boolean;
    processingFeeEnabled?: boolean;
    processingFeePercent?: number;
    processingFeeFlatAmount?: number;
    stripePaymentLink?: string;
    stripeQrEnabled?: boolean;
  }>(value).map((method) => ({
    id: method.id,
    label: method.label,
    details: method.details ?? "",
    preferred: Boolean(method.preferred),
    processingFeeEnabled: Boolean(method.processingFeeEnabled),
    processingFeePercent: Number(method.processingFeePercent ?? 0),
    processingFeeFlatAmount: Number(method.processingFeeFlatAmount ?? 0),
    stripePaymentLink: method.stripePaymentLink ?? "",
    stripeQrEnabled: Boolean(method.stripeQrEnabled),
  }));
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

function mapDashboardInvoiceRow(row: DashboardInvoiceRow): InvoiceRecord {
  return {
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
      companyName: "",
      taxRegistrations: [],
      logoUrl: null,
    },
    lineItems: [],
    taxLines: [],
    paymentMethods: [],
    notes: "",
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
}

export function serializeInvoice(invoice: { status: InvoiceStatus; currencyCode: "CAD" | "USD"; issueDate: string; dueDate: string; projectReference: string; billTo: BillTo; companySnapshot: InvoiceRecord["companySnapshot"]; lineItems: InvoiceRecord["lineItems"]; taxLines: TaxLine[]; paymentMethods: InvoiceRecord["paymentMethods"]; notes: string; amountPaid: number }) {
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

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const { supabase, organization, profile } = await requireOrganizationContext();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      [
        "id",
        "invoice_number",
        "sequence_number",
        "status",
        "currency_code",
        "issue_date",
        "due_date",
        "project_reference",
        "bill_to",
        "amount_paid",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
        "balance_due",
        "issued_at",
        "paid_at",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .returns<DashboardInvoiceRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    profile,
    invoices: (data ?? []).map(mapDashboardInvoiceRow),
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
