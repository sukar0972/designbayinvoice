export type CurrencyCode = "CAD" | "USD";

export type OrganizationRole = "owner" | "member";

export type OrganizationMembershipStatus = "active" | "removed";

export type OrganizationInviteStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

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
  processingFeeEnabled?: boolean;
  processingFeePercent?: number;
  processingFeeFlatAmount?: number;
  stripePaymentLink?: string;
  stripeQrEnabled?: boolean;
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

export type Organization = {
  id: string;
  ownerUserId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  role: OrganizationRole;
  status: OrganizationMembershipStatus;
  createdAt: string;
};

export type OrganizationInvite = {
  id: string;
  organizationId: string;
  invitedByUserId: string;
  email: string;
  token: string;
  status: OrganizationInviteStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  createdAt: string;
};

export type PendingOrganizationInvite = OrganizationInvite & {
  organizationName: string;
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

export type OrganizationContext = {
  organization: Organization;
  membership: OrganizationMember;
  profile: BusinessProfileForm;
};

export type SettingsSnapshot = OrganizationContext & {
  members: OrganizationMember[];
  invites: OrganizationInvite[];
};

export type InviteAcceptanceResult =
  | { ok: true; organizationId: string }
  | { ok: false; reason: "missing_token" | "invalid" | "expired" | "revoked" | "accepted" | "already_member" }
  | { ok: false; reason: "email_mismatch"; invitedEmail: string };
