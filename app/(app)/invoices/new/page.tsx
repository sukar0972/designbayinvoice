import { getNewInvoiceSeed } from "@/lib/data";

import { InvoiceEditor } from "@/components/invoices/invoice-editor";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const params = await searchParams;
  const { invoice, profile } = await getNewInvoiceSeed(params.duplicate);

  return <InvoiceEditor initialInvoice={invoice} isNew profile={profile} />;
}
