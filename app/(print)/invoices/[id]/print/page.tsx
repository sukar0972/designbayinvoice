import { requireUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/data";

import { AutoPrint } from "@/components/invoices/auto-print";
import { InvoiceDocument } from "@/components/invoices/invoice-document";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { autoprint } = await searchParams;
  const invoice = await getInvoiceById(id);

  return (
    <main className="min-h-screen bg-white px-4 py-8 print:px-0 print:py-0">
      {autoprint === "1" ? <AutoPrint /> : null}
      <div className="mx-auto max-w-[190mm] print:max-w-none">
        <InvoiceDocument invoice={invoice} printable />
      </div>
    </main>
  );
}
