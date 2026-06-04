import { computeInvoiceTotals, deriveInvoiceStatus } from "@/lib/invoices/calculations";
import { createDuplicateInvoice } from "@/lib/invoices/defaults";
import type { InvoiceFormState, InvoiceRecord, InvoiceStatus } from "@/types/domain";

export type InvoiceReservation = {
  invoiceNumber: string;
  sequenceNumber: number;
};

export function buildCreatePayload(
  invoice: InvoiceFormState,
  reservation: InvoiceReservation,
) {
  const status = deriveInvoiceStatus(
    invoice.status,
    invoice.amountPaid,
    computeInvoiceTotals(invoice).totalAmount,
  );

  return {
    status,
    invoice_number: reservation.invoiceNumber,
    sequence_number: reservation.sequenceNumber,
    issued_at: status === "draft" ? null : new Date().toISOString(),
    paid_at: status === "paid" ? new Date().toISOString() : null,
  };
}

export function buildUpdatePayload(
  invoice: InvoiceFormState,
  existing: {
    status: InvoiceStatus;
    issued_at: string | null;
    paid_at: string | null;
  },
) {
  const totals = computeInvoiceTotals(invoice);
  const status = deriveInvoiceStatus(invoice.status, invoice.amountPaid, totals.totalAmount);

  return {
    status,
    issued_at: existing.issued_at ?? (status === "draft" ? null : new Date().toISOString()),
    paid_at: status === "paid" ? existing.paid_at ?? new Date().toISOString() : null,
  };
}

export function buildStatusTransitionPayload(
  nextStatus: InvoiceStatus,
  existing: {
    status: InvoiceStatus;
    amount_paid: string | number;
    total_amount: string | number;
  },
) {
  return {
    status: deriveInvoiceStatus(
      nextStatus,
      Number(existing.amount_paid),
      Number(existing.total_amount),
    ),
    issued_at: nextStatus === "draft" ? null : new Date().toISOString(),
    paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
  };
}

export function buildTogglePaidPayload(
  nextStatus: "issued" | "paid",
  existing: {
    status: InvoiceStatus;
    total_amount: string | number;
    issued_at: string | null;
  },
) {
  const totalAmount = Number(existing.total_amount);
  const nextAmountPaid = nextStatus === "paid" ? totalAmount : 0;
  const nextBalanceDue = nextStatus === "paid" ? 0 : totalAmount;

  return {
    status: nextStatus,
    amount_paid: nextAmountPaid,
    balance_due: nextBalanceDue,
    issued_at: existing.issued_at ?? new Date().toISOString(),
    paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
  };
}

export function buildDuplicatePayload(
  source: InvoiceRecord,
  reservation: InvoiceReservation,
): InvoiceFormState {
  return {
    ...createDuplicateInvoice(source),
    invoiceNumber: reservation.invoiceNumber,
    sequenceNumber: reservation.sequenceNumber,
  };
}

export function buildRecordPaymentPayload(
  amount: number,
  existing: {
    amount_paid: string | number;
    total_amount: string | number;
  },
) {
  const nextPaid = Number(existing.amount_paid) + amount;
  const totalAmount = Number(existing.total_amount);
  const status = deriveInvoiceStatus("issued", nextPaid, totalAmount);

  return {
    amount_paid: nextPaid,
    balance_due: Math.max(totalAmount - nextPaid, 0),
    status,
    paid_at: status === "paid" ? new Date().toISOString() : null,
  };
}
