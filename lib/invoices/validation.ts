import { z } from "zod";

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
});

export const billToSchema = z.object({
  name: z.string().trim().min(1, "Client name is required."),
  attention: z.string().optional().default(""),
  email: z.string().email().or(z.literal("")).optional().default(""),
  phone: z.string().optional().default(""),
  address1: z.string().trim().min(1, "Address line 1 is required."),
  address2: z.string().optional().default(""),
  city: z.string().optional().default(""),
  province: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default("Canada"),
});

export const companySnapshotSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
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
  description: z.string().trim().min(1, "Each line item needs a description."),
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
  lineItems: z.array(lineItemSchema).min(1),
  taxLines: z.array(taxLineSchema).default([]),
  paymentMethods: z.array(paymentInstructionSchema).default([]),
  notes: z.string().default(""),
  amountPaid: z.coerce.number().min(0),
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
