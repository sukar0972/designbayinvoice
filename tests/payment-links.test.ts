import { describe, expect, it } from "vitest";

import { normalizePaymentInstruction } from "@/lib/invoices/defaults";
import { getStripePaymentQrDataUrl, normalizeStripePaymentLink } from "@/lib/invoices/payment-links";
import { businessProfileSchema, invoiceSchema } from "@/lib/invoices/validation";

describe("payment link helpers", () => {
  it("normalizes valid https stripe links", () => {
    expect(normalizeStripePaymentLink(" https://buy.stripe.com/test_123 ")).toBe(
      "https://buy.stripe.com/test_123",
    );
  });

  it("rejects non-https links", () => {
    expect(normalizeStripePaymentLink("http://buy.stripe.com/test_123")).toBe("");
  });

  it("treats stripe and qr as card-only fields", () => {
    const normalized = normalizePaymentInstruction({
      id: "pay-2",
      label: "Interac e-Transfer",
      stripePaymentLink: "https://buy.stripe.com/test_123",
      stripeQrEnabled: true,
    });

    expect(normalized.stripePaymentLink).toBe("");
    expect(normalized.stripeQrEnabled).toBe(false);
  });

  it("disables qr when the payment link is missing", () => {
    const normalized = normalizePaymentInstruction({
      id: "pay-1",
      label: "Credit Card",
      stripePaymentLink: "",
      stripeQrEnabled: true,
    });

    expect(normalized.stripeQrEnabled).toBe(false);
  });

  it("generates a small svg data url for qr rendering", () => {
    const dataUrl = getStripePaymentQrDataUrl("https://buy.stripe.com/test_123");

    expect(dataUrl).toBeTruthy();
    expect(dataUrl!.length).toBeLessThan(1_000_000);
  });
});

describe("payment method validation", () => {
  it("rejects qr codes without a stripe payment link", () => {
    const result = invoiceSchema.safeParse({
      status: "draft",
      currencyCode: "CAD",
      issueDate: "2026-04-07",
      dueDate: "2026-04-21",
      projectReference: "",
      billTo: {
        name: "",
        address1: "",
      },
      companySnapshot: {
        companyName: "",
        taxRegistrations: [],
      },
      lineItems: [],
      taxLines: [],
      paymentMethods: [
        {
          id: "pay-1",
          label: "Card",
          details: "",
          preferred: false,
          processingFeeEnabled: false,
          processingFeePercent: 0,
          processingFeeFlatAmount: 0,
          stripePaymentLink: "",
          stripeQrEnabled: true,
        },
      ],
      notes: "",
      amountPaid: 0,
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid stripe link settings on the business profile", () => {
    const result = businessProfileSchema.safeParse({
      companyName: "Acme Studio",
      email: "",
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
      defaultCurrency: "CAD",
      defaultPaymentMethods: [
        {
          id: "pay-1",
          label: "Credit Card",
          details: "",
          preferred: false,
          processingFeeEnabled: false,
          processingFeePercent: 0,
          processingFeeFlatAmount: 0,
          stripePaymentLink: "https://buy.stripe.com/test_123",
          stripeQrEnabled: true,
        },
      ],
      defaultNotes: "",
      logoPath: null,
      logoUrl: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects stripe links on non-card payment methods", () => {
    const result = businessProfileSchema.safeParse({
      companyName: "Acme Studio",
      email: "",
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
      defaultCurrency: "CAD",
      defaultPaymentMethods: [
        {
          id: "pay-1",
          label: "Interac e-Transfer",
          details: "",
          preferred: false,
          processingFeeEnabled: false,
          processingFeePercent: 0,
          processingFeeFlatAmount: 0,
          stripePaymentLink: "https://buy.stripe.com/test_123",
          stripeQrEnabled: false,
        },
      ],
      defaultNotes: "",
      logoPath: null,
      logoUrl: null,
    });

    expect(result.success).toBe(false);
  });
});
