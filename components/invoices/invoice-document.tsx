import type { InvoiceFormState, InvoiceRecord } from "@/types/domain";
import { computeInvoiceTotals, formatCurrency, formatLongDate } from "@/lib/invoices/calculations";
import { STATUS_LABELS } from "@/lib/invoices/constants";

type InvoiceDocumentProps = {
  invoice: InvoiceFormState | InvoiceRecord;
  printable?: boolean;
};

export function InvoiceDocument({
  invoice,
  printable = false,
}: InvoiceDocumentProps) {
  const totals = computeInvoiceTotals(invoice);

  return (
    <article
      className={`mx-auto overflow-hidden rounded-[2rem] border border-[rgba(15,23,42,0.08)] bg-white text-[#0f172a] shadow-[0_30px_100px_rgba(15,23,42,0.12)] ${
        printable ? "max-w-[210mm]" : "max-w-[860px]"
      }`}
    >
      <div className="h-4 bg-[linear-gradient(90deg,#1457ff_0%,#ff7f32_100%)]" />
      <div className="p-6 sm:p-8 md:p-10">
        <header className="flex flex-col gap-8 border-b border-[#e2e8f0] pb-8 md:flex-row md:justify-between">
          <div className="max-w-md">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#94a3b8]">
              {invoice.companySnapshot.companyName || "Your company"}
            </p>
            <div className="mt-4 flex items-center gap-4">
              {invoice.companySnapshot.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${invoice.companySnapshot.companyName} logo`}
                  className="h-14 w-14 rounded-2xl border border-[#e2e8f0] object-cover"
                  src={invoice.companySnapshot.logoUrl}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f5f9] font-black text-[#64748b]">
                  DB
                </div>
              )}
              <div>
                <h1 className="display-font text-4xl leading-none sm:text-5xl">Invoice</h1>
                <p className="mt-2 text-sm text-[#64748b]">
                  {invoice.invoiceNumber || "Assigned on first save"}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-1 text-sm leading-6 text-[#475569]">
              <p className="font-semibold text-[#0f172a]">{invoice.companySnapshot.companyName || "Business profile needed"}</p>
              {invoice.companySnapshot.address1 ? <p>{invoice.companySnapshot.address1}</p> : null}
              {invoice.companySnapshot.address2 ? <p>{invoice.companySnapshot.address2}</p> : null}
              {(invoice.companySnapshot.city || invoice.companySnapshot.province || invoice.companySnapshot.postalCode) ? (
                <p>
                  {[invoice.companySnapshot.city, invoice.companySnapshot.province, invoice.companySnapshot.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {invoice.companySnapshot.country ? <p>{invoice.companySnapshot.country}</p> : null}
              {invoice.companySnapshot.email ? <p>{invoice.companySnapshot.email}</p> : null}
              {invoice.companySnapshot.phone ? <p>{invoice.companySnapshot.phone}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 text-sm md:min-w-[250px]">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-[#64748b]">Status</span>
              <span className="status-pill" data-status={invoice.status}>
                {STATUS_LABELS[invoice.status]}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-[#64748b]">Issue date</span>
              <span className="font-semibold">{formatLongDate(invoice.issueDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-[#64748b]">Due date</span>
              <span className="font-semibold">{formatLongDate(invoice.dueDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-[#64748b]">Currency</span>
              <span className="font-semibold">{invoice.currencyCode}</span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-[#e2e8f0] py-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#94a3b8]">Bill to</p>
            <h2 className="mt-3 text-2xl font-black text-[#0f172a]">
              {invoice.billTo.name || "Add a client name"}
            </h2>
            <div className="mt-2 space-y-1 text-sm leading-6 text-[#475569]">
              {invoice.billTo.attention ? <p>Attn: {invoice.billTo.attention}</p> : null}
              {invoice.billTo.address1 ? <p>{invoice.billTo.address1}</p> : null}
              {invoice.billTo.address2 ? <p>{invoice.billTo.address2}</p> : null}
              {(invoice.billTo.city || invoice.billTo.province || invoice.billTo.postalCode) ? (
                <p>
                  {[invoice.billTo.city, invoice.billTo.province, invoice.billTo.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {invoice.billTo.country ? <p>{invoice.billTo.country}</p> : null}
              {invoice.billTo.email ? <p>{invoice.billTo.email}</p> : null}
              {invoice.billTo.phone ? <p>{invoice.billTo.phone}</p> : null}
            </div>
          </div>

          <div className="rounded-[1.6rem] bg-[#f8fafc] px-5 py-4 text-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#94a3b8]">Project</p>
            <p className="mt-3 max-w-[240px] text-base font-semibold text-[#0f172a]">
              {invoice.projectReference || "Project details go here"}
            </p>
          </div>
        </section>

        <section className="border-b border-[#e2e8f0] py-8">
          <div className="hidden grid-cols-[1.7fr_0.45fr_0.55fr_0.7fr] gap-4 border-b border-[#e2e8f0] pb-3 text-xs font-black uppercase tracking-[0.24em] text-[#94a3b8] md:grid">
            <p>Description</p>
            <p className="text-right">Qty</p>
            <p className="text-right">Rate</p>
            <p className="text-right">Amount</p>
          </div>

          <div className="divide-y divide-[#f1f5f9]">
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="grid gap-2 py-4 md:grid-cols-[1.7fr_0.45fr_0.55fr_0.7fr] md:items-start md:gap-4">
                <div>
                  <p className="font-semibold text-[#0f172a]">{item.description || "Untitled service"}</p>
                </div>
                <p className="text-sm text-[#64748b] md:text-right">{item.quantity}</p>
                <p className="text-sm text-[#64748b] md:text-right">
                  {formatCurrency(item.unitPrice, invoice.currencyCode)}
                </p>
                <p className="font-bold text-[#0f172a] md:text-right">
                  {formatCurrency(item.quantity * item.unitPrice, invoice.currencyCode)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#94a3b8]">Payment methods</p>
              <div className="mt-4 space-y-3">
                {invoice.paymentMethods.length > 0 ? (
                  invoice.paymentMethods.map((method) => (
                    <div key={method.id} className="rounded-[1.4rem] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[#0f172a]">{method.label}</p>
                        {method.preferred ? (
                          <span className="rounded-full bg-[rgba(20,87,255,0.12)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#1457ff]">
                            Preferred
                          </span>
                        ) : null}
                      </div>
                      {method.details ? (
                        <p className="mt-2 text-sm leading-6 text-[#475569]">{method.details}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#64748b]">Add at least one payment instruction in settings or on this invoice.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#94a3b8]">Notes</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#475569]">
                {invoice.notes || "No additional notes."}
              </p>
            </div>

            {invoice.companySnapshot.businessNumber || invoice.companySnapshot.taxRegistrations.length > 0 ? (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#94a3b8]">Registration details</p>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[#475569]">
                  {invoice.companySnapshot.businessNumber ? (
                    <p>
                      Business number:{" "}
                      <span className="font-semibold text-[#0f172a]">
                        {invoice.companySnapshot.businessNumber}
                      </span>
                    </p>
                  ) : null}
                  {invoice.companySnapshot.taxRegistrations.map((registration) => (
                    <p key={registration.id}>
                      {registration.label}:{" "}
                      <span className="font-semibold text-[#0f172a]">{registration.number}</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.8rem] bg-[#0f172a] px-6 py-5 text-white md:min-w-[300px]">
            <div className="flex items-center justify-between py-2 text-sm text-[rgba(255,255,255,0.72)]">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotalAmount, invoice.currencyCode)}</span>
            </div>
            {invoice.taxLines.map((tax) => (
              <div key={tax.id} className="flex items-center justify-between py-2 text-sm text-[rgba(255,255,255,0.72)]">
                <span>
                  {tax.label} ({tax.rate}%)
                </span>
                <span>
                  {formatCurrency(totals.subtotalAmount * (tax.rate / 100), invoice.currencyCode)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 text-sm text-[rgba(255,255,255,0.72)]">
              <span>Amount paid</span>
              <span>{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</span>
            </div>
            <div className="mt-4 border-t border-[rgba(255,255,255,0.1)] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">Balance due</span>
                <span className="display-font text-4xl">
                  {formatCurrency(totals.balanceDue, invoice.currencyCode)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
