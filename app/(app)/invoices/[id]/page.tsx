import { getInvoiceById } from "@/lib/data";

import { InvoiceEditor } from "@/components/invoices/invoice-editor";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoiceById(id);

  return (
    <InvoiceEditor
      initialInvoice={invoice}
      isNew={false}
      initialMessage={query.saved === "1" ? "Invoice saved." : null}
    />
  );
}
