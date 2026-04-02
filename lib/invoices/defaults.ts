import { DEFAULT_BILL_TO, EMPTY_COMPANY_PROFILE } from "@/lib/invoices/constants";
import type {
  BusinessProfileForm,
  InvoiceFormState,
  InvoiceRecord,
  LineItem,
  PaymentInstruction,
  TaxLine,
} from "@/types/domain";

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createLineItem(): LineItem {
  return {
    id: newId("item"),
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export function createTaxLine(): TaxLine {
  return {
    id: newId("tax"),
    label: "HST",
    rate: 13,
  };
}

export function createPaymentInstruction(label = ""): PaymentInstruction {
  return {
    id: newId("pay"),
    label,
    details: "",
    preferred: false,
  };
}

export function toCompanySnapshot(profile: BusinessProfileForm) {
  return {
    companyName: profile.companyName,
    email: profile.email,
    phone: profile.phone,
    address1: profile.address1,
    address2: profile.address2,
    city: profile.city,
    province: profile.province,
    postalCode: profile.postalCode,
    country: profile.country,
    businessNumber: profile.businessNumber,
    taxRegistrations: profile.taxRegistrations,
    logoPath: profile.logoPath ?? null,
    logoUrl: profile.logoUrl ?? null,
  };
}

export function createEmptyInvoice(profile?: BusinessProfileForm): InvoiceFormState {
  const businessProfile = profile ?? EMPTY_COMPANY_PROFILE();
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 14);

  return {
    status: "draft",
    currencyCode: businessProfile.defaultCurrency,
    issueDate: today.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    projectReference: "",
    billTo: { ...DEFAULT_BILL_TO },
    companySnapshot: toCompanySnapshot(businessProfile),
    lineItems: [createLineItem()],
    taxLines: [],
    paymentMethods: businessProfile.defaultPaymentMethods.map((method) => ({
      ...method,
    })),
    notes: businessProfile.defaultNotes,
    amountPaid: 0,
  };
}

export function createDuplicateInvoice(source: InvoiceRecord): InvoiceFormState {
  return {
    ...source,
    id: undefined,
    invoiceNumber: null,
    sequenceNumber: null,
    status: "draft",
    amountPaid: 0,
    lineItems: source.lineItems.map((item) => ({ ...item, id: newId("item") })),
    taxLines: source.taxLines.map((taxLine) => ({ ...taxLine, id: newId("tax") })),
    paymentMethods: source.paymentMethods.map((method) => ({
      ...method,
      id: newId("pay"),
    })),
  };
}
