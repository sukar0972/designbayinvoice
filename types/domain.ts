export type CurrencyCode = "CAD" | "USD";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "void";

export type TaxRegistration = {
  id: string;
  label: string;
  number: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type TaxLine = {
  id: string;
  label: string;
  rate: number;
};

export type PaymentInstruction = {
  id: string;
  label: string;
  details: string;
  preferred: boolean;
};

export type BillTo = {
  name: string;
  attention?: string;
  email?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
};

export type CompanySnapshot = {
  companyName: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  businessNumber?: string;
  taxRegistrations: TaxRegistration[];
  logoPath?: string | null;
  logoUrl?: string | null;
};

export type BusinessProfileForm = {
  companyName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  businessNumber: string;
  taxRegistrations: TaxRegistration[];
  invoicePrefix: string;
  nextInvoiceSequence: number;
  defaultCurrency: CurrencyCode;
  defaultPaymentMethods: PaymentInstruction[];
  defaultNotes: string;
  logoPath?: string | null;
  logoUrl?: string | null;
};

export type InvoiceFormState = {
  id?: string;
  invoiceNumber?: string | null;
  sequenceNumber?: number | null;
  status: InvoiceStatus;
  currencyCode: CurrencyCode;
  issueDate: string;
  dueDate: string;
  projectReference: string;
  billTo: BillTo;
  companySnapshot: CompanySnapshot;
  lineItems: LineItem[];
  taxLines: TaxLine[];
  paymentMethods: PaymentInstruction[];
  notes: string;
  amountPaid: number;
  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceRecord = InvoiceFormState & {
  id: string;
  invoiceNumber: string;
  sequenceNumber: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  balanceDue: number;
  issuedAt?: string | null;
  paidAt?: string | null;
};

export type DashboardSnapshot = {
  profile: BusinessProfileForm;
  invoices: InvoiceRecord[];
};
