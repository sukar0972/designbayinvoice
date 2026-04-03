import { describe, expect, it } from "vitest";

import {
  buildInvoiceNumber,
  canDeleteInvoice,
  canTransitionStatus,
  computeInvoiceTotals,
  computePaymentMethodProcessingFee,
  computePaymentMethodTotal,
  deriveInvoiceStatus,
  formatCurrency,
} from "@/lib/invoices/calculations";
import { createDuplicateInvoice, createEmptyInvoice } from "@/lib/invoices/defaults";
import { EMPTY_COMPANY_PROFILE } from "@/lib/invoices/constants";

describe("invoice calculations", () => {
  it("computes subtotal, tax, total, and balance", () => {
    const invoice = createEmptyInvoice(EMPTY_COMPANY_PROFILE("billing@example.com"));
    invoice.lineItems = [
      { id: "1", description: "Strategy", quantity: 2, unitPrice: 500 },
      { id: "2", description: "Build", quantity: 1, unitPrice: 1500 },
    ];
    invoice.taxLines = [{ id: "tax", label: "HST", rate: 13 }];
    invoice.amountPaid = 1000;

    expect(computeInvoiceTotals(invoice)).toEqual({
      subtotalAmount: 2500,
      taxAmount: 325,
      totalAmount: 2825,
      balanceDue: 1825,
    });
  });

  it("builds the invoice number from prefix, year, and sequence", () => {
    expect(buildInvoiceNumber("db", "2026-04-02", 7)).toBe("DB-2026-007");
  });

  it("derives payment status from the amount paid", () => {
    expect(deriveInvoiceStatus("issued", 0, 500)).toBe("issued");
    expect(deriveInvoiceStatus("issued", 200, 500)).toBe("partially_paid");
    expect(deriveInvoiceStatus("issued", 500, 500)).toBe("paid");
  });

  it("restricts destructive invoice actions to drafts", () => {
    expect(canDeleteInvoice("draft")).toBe(true);
    expect(canDeleteInvoice("issued")).toBe(false);
    expect(canTransitionStatus("draft", "issued")).toBe(true);
    expect(canTransitionStatus("paid", "draft")).toBe(false);
  });

  it("formats CAD and USD distinctly", () => {
    expect(formatCurrency(1200, "CAD")).toMatch(/\$1,200\.00/);
    expect(formatCurrency(1200, "USD")).toContain("$1,200.00");
  });

  it("computes a payment-method processing fee on the remaining balance", () => {
    const invoice = createEmptyInvoice(EMPTY_COMPANY_PROFILE("billing@example.com"));
    invoice.lineItems = [{ id: "1", description: "Build", quantity: 1, unitPrice: 1000 }];
    invoice.taxLines = [{ id: "tax", label: "HST", rate: 13 }];
    invoice.amountPaid = 130;

    const cardMethod = {
      id: "card",
      label: "Credit Card",
      details: "",
      preferred: false,
      processingFeeEnabled: true,
      processingFeePercent: 2.9,
      processingFeeFlatAmount: 0.3,
    };

    expect(computePaymentMethodProcessingFee(invoice, cardMethod)).toBe(29.3);
    expect(computePaymentMethodTotal(invoice, cardMethod)).toBe(1029.3);
  });

  it("duplicates invoices as a new unsaved draft", () => {
    const invoice = createEmptyInvoice();
    invoice.invoiceNumber = "INV-2026-001";
    invoice.sequenceNumber = 1;
    invoice.status = "issued";
    invoice.amountPaid = 125;

    const duplicate = createDuplicateInvoice({
      ...invoice,
      id: "invoice-id",
      invoiceNumber: "INV-2026-001",
      sequenceNumber: 1,
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      balanceDue: 0,
    });

    expect(duplicate.id).toBeUndefined();
    expect(duplicate.invoiceNumber).toBeNull();
    expect(duplicate.sequenceNumber).toBeNull();
    expect(duplicate.status).toBe("draft");
    expect(duplicate.amountPaid).toBe(0);
  });
});
