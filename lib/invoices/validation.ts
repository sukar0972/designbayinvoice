import { z } from "zod";
import { isCardPaymentMethod } from "@/lib/invoices/payment-links";

const stripePaymentLinkSchema = z
  .string()
  .trim()
  .max(500, "Stripe payment link must be 500 characters or fewer.")
  .default("")
  .refine((value) => {
    if (!value) {
      return true;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Stripe payment link must be a valid HTTPS URL.");

export const taxRegistrationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  number: z.string().min(1),
});

export const paymentInstructionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  details: z.string().default(""),
  preferred: z.boolean().default(false),
  processingFeeEnabled: z.boolean().default(false),
  processingFeePercent: z.coerce.number().min(0).default(0),
  processingFeeFlatAmount: z.coerce.number().min(0).default(0),
  stripePaymentLink: stripePaymentLinkSchema,
  stripeQrEnabled: z.boolean().default(false),
}).superRefine((method, ctx) => {
  const isCardMethod = isCardPaymentMethod(method.label);

  if (!isCardMethod && method.stripePaymentLink.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Stripe payment links are only available for card payment methods.",
      path: ["stripePaymentLink"],
    });
  }

  if (method.stripeQrEnabled && method.stripePaymentLink.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add a Stripe payment link before enabling a QR code.",
      path: ["stripeQrEnabled"],
    });
  }

  if (!isCardMethod && method.stripeQrEnabled) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "QR codes are only available for card payment methods.",
      path: ["stripeQrEnabled"],
    });
  }
});

export const billToSchema = z.object({
  name: z.string().default(""),
  attention: z.string().optional().default(""),
  email: z.string().email().or(z.literal("")).optional().default(""),
  phone: z.string().optional().default(""),
  address1: z.string().default(""),
  address2: z.string().optional().default(""),
  city: z.string().optional().default(""),
  province: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default("Canada"),
});

export const companySnapshotSchema = z.object({
  companyName: z.string().default(""),
  email: z.string().email().or(z.literal("")).optional().default(""),
  phone: z.string().optional().default(""),
  address1: z.string().optional().default(""),
  address2: z.string().optional().default(""),
  city: z.string().optional().default(""),
  province: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default("Canada"),
  businessNumber: z.string().optional().default(""),
  taxRegistrations: z.array(taxRegistrationSchema).default([]),
  logoPath: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

export const lineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().default(""),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
});

export const taxLineSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
  rate: z.coerce.number().min(0),
});

export const invoiceSchema = z.object({
  id: z.string().uuid().optional(),
  invoiceNumber: z.string().nullable().optional(),
  sequenceNumber: z.coerce.number().nullable().optional(),
  status: z.enum(["draft", "issued", "partially_paid", "paid", "void"]),
  currencyCode: z.enum(["CAD", "USD"]),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  projectReference: z.string().default(""),
  billTo: billToSchema,
  companySnapshot: companySnapshotSchema,
  lineItems: z.array(lineItemSchema).default([]),
  taxLines: z.array(taxLineSchema).default([]),
  paymentMethods: z.array(paymentInstructionSchema).default([]),
  notes: z.string().default(""),
  amountPaid: z.coerce.number().min(0),
}).superRefine((invoice, ctx) => {
  if (invoice.status === "draft") {
    return;
  }

  if (invoice.billTo.name.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Client name is required.",
      path: ["billTo", "name"],
    });
  }

  if (invoice.billTo.address1.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Address line 1 is required.",
      path: ["billTo", "address1"],
    });
  }

  if (invoice.companySnapshot.companyName.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Company name is required.",
      path: ["companySnapshot", "companyName"],
    });
  }

  if (invoice.lineItems.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one line item is required.",
      path: ["lineItems"],
    });
    return;
  }

  invoice.lineItems.forEach((item, index) => {
    if (item.description.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each line item needs a description.",
        path: ["lineItems", index, "description"],
      });
    }
  });
});

export const businessProfileSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  email: z.string().email().or(z.literal("")),
  phone: z.string().default(""),
  address1: z.string().default(""),
  address2: z.string().default(""),
  city: z.string().default(""),
  province: z.string().default(""),
  postalCode: z.string().default(""),
  country: z.string().default("Canada"),
  businessNumber: z.string().default(""),
  taxRegistrations: z.array(taxRegistrationSchema).default([]),
  invoicePrefix: z.string().trim().min(1).max(12),
  nextInvoiceSequence: z.coerce.number().int().min(1),
  defaultCurrency: z.enum(["CAD", "USD"]),
  defaultPaymentMethods: z.array(paymentInstructionSchema).default([]),
  defaultNotes: z.string().default(""),
  logoPath: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});
