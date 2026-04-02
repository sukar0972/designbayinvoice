import { getBusinessProfileForCurrentUser, getInvoiceById } from "@/lib/data";

import { InvoiceEditor } from "@/components/invoices/invoice-editor";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, profile] = await Promise.all([
    getInvoiceById(id),
    getBusinessProfileForCurrentUser(),
  ]);

  return <InvoiceEditor initialInvoice={invoice} isNew={false} profile={profile} />;
}
