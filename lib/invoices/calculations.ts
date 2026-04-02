import type {
  CurrencyCode,
  InvoiceFormState,
  InvoiceRecord,
  InvoiceStatus,
} from "@/types/domain";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function sanitizeMoney(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }

  return round(value);
}

export function computeInvoiceTotals(invoice: InvoiceFormState | InvoiceRecord) {
  const subtotal = sanitizeMoney(
    invoice.lineItems.reduce((sum, item) => {
      return sum + sanitizeMoney(item.quantity) * sanitizeMoney(item.unitPrice);
    }, 0),
  );

  const taxAmount = sanitizeMoney(
    invoice.taxLines.reduce((sum, taxLine) => {
      return sum + subtotal * (sanitizeMoney(taxLine.rate) / 100);
    }, 0),
  );

  const totalAmount = sanitizeMoney(subtotal + taxAmount);
  const amountPaid = sanitizeMoney(invoice.amountPaid);
  const balanceDue = sanitizeMoney(Math.max(totalAmount - amountPaid, 0));

  return {
    subtotalAmount: subtotal,
    taxAmount,
    totalAmount,
    balanceDue,
  };
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode) {
  const locale = currencyCode === "CAD" ? "en-CA" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function buildInvoiceNumber(prefix: string, issueDate: string, sequence: number) {
  const year = new Date(`${issueDate}T00:00:00`).getFullYear();
  const cleanPrefix = prefix.trim().toUpperCase() || "INV";

  return `${cleanPrefix}-${year}-${String(sequence).padStart(3, "0")}`;
}

export function deriveInvoiceStatus(
  status: InvoiceStatus,
  amountPaid: number,
  totalAmount: number,
) {
  if (status === "void" || status === "draft") {
    return status;
  }

  if (amountPaid <= 0) {
    return "issued";
  }

  if (amountPaid >= totalAmount) {
    return "paid";
  }

  return "partially_paid";
}

export function isOverdue(invoice: InvoiceRecord) {
  if (invoice.status === "draft" || invoice.status === "paid" || invoice.status === "void") {
    return false;
  }

  const today = new Date();
  const due = new Date(`${invoice.dueDate}T00:00:00`);

  return due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function canDeleteInvoice(status: InvoiceStatus) {
  return status === "draft";
}

export function canTransitionStatus(current: InvoiceStatus, next: InvoiceStatus) {
  if (current === next) {
    return true;
  }

  const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ["issued", "void"],
    issued: ["partially_paid", "paid", "void"],
    partially_paid: ["paid", "void"],
    paid: ["void"],
    void: [],
  };

  return transitions[current].includes(next);
}
