import { requireUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/data";

import { InvoiceDocument } from "@/components/invoices/invoice-document";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  return (
    <main className="min-h-screen bg-white px-4 py-8 print:px-0 print:py-0">
      <div className="mx-auto max-w-[980px] print:max-w-none">
        <InvoiceDocument invoice={invoice} printable />
      </div>
    </main>
  );
}
