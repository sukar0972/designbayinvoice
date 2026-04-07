import type {
  BillTo,
  BusinessProfileForm,
  PaymentInstruction,
} from "@/types/domain";

export const DEFAULT_PAYMENT_METHODS: PaymentInstruction[] = [
  {
    id: "interac",
    label: "Interac e-Transfer",
    details: "Auto-deposit enabled. Use invoice number as the payment reference.",
    preferred: true,
    processingFeeEnabled: false,
    processingFeePercent: 0,
    processingFeeFlatAmount: 0,
  },
  {
    id: "card",
    label: "Credit Card",
    details: "Card payment can be arranged manually or through a Stripe payment link.",
    preferred: false,
    processingFeeEnabled: false,
    processingFeePercent: 2.9,
    processingFeeFlatAmount: 0.3,
    stripePaymentLink: "",
    stripeQrEnabled: false,
  },
  {
    id: "cash",
    label: "Cheque / Cash",
    details: "Make cheques payable to your business name.",
    preferred: false,
    processingFeeEnabled: false,
    processingFeePercent: 0,
    processingFeeFlatAmount: 0,
    stripePaymentLink: "",
    stripeQrEnabled: false,
  },
];

export const DEFAULT_BILL_TO: BillTo = {
  name: "",
  attention: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Canada",
};

export const EMPTY_COMPANY_PROFILE = (
  email = "",
): BusinessProfileForm => ({
  companyName: "",
  email,
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
  defaultPaymentMethods: DEFAULT_PAYMENT_METHODS,
  defaultNotes:
    "Payment is due within the agreed terms. Please include the invoice number when sending payment.",
  logoPath: null,
  logoUrl: null,
});

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  issued: "Issued - unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
};
