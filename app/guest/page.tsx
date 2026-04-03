import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { createEmptyInvoice } from "@/lib/invoices/defaults";
import { EMPTY_COMPANY_PROFILE } from "@/lib/invoices/constants";

export default function GuestInvoicePage() {
  const guestProfile = EMPTY_COMPANY_PROFILE();
  const invoice = createEmptyInvoice(guestProfile);

  return <InvoiceEditor backHref="/" guestMode initialInvoice={invoice} isNew />;
}
