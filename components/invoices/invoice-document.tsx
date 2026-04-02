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
      className={`mx-auto bg-white text-[var(--foreground)] ${
        printable ? "max-w-[210mm]" : "max-w-[860px] rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)] border border-[var(--border)] overflow-hidden"
      }`}
    >
      <div className="p-8 sm:p-12">
        <header className="flex flex-col gap-8 md:flex-row md:justify-between pb-8 border-b border-[var(--border)]">
          <div className="max-w-md">
            <div className="flex items-center gap-4 mb-6">
              {invoice.companySnapshot.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${invoice.companySnapshot.companyName} logo`}
                  className="h-12 w-12 rounded border border-[var(--border)] object-cover"
                  src={invoice.companySnapshot.logoUrl}
                />
              ) : null}
              <div>
                <h1 className="text-2xl font-semibold text-[var(--foreground)] tracking-tight">Invoice</h1>
                <p className="text-sm text-[var(--muted)]">
                  {invoice.invoiceNumber || "Pending"}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-sm text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">{invoice.companySnapshot.companyName || "Your Company"}</p>
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
              {invoice.companySnapshot.email ? <p className="mt-1">{invoice.companySnapshot.email}</p> : null}
              {invoice.companySnapshot.phone ? <p>{invoice.companySnapshot.phone}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-x-8 gap-y-4 text-sm md:text-right min-w-[200px]">
            <div>
              <p className="font-medium text-[var(--muted)] mb-1">Status</p>
              <p className="font-semibold text-[var(--foreground)]">{STATUS_LABELS[invoice.status]}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--muted)] mb-1">Issued</p>
              <p className="font-semibold text-[var(--foreground)]">{formatLongDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--muted)] mb-1">Due</p>
              <p className="font-semibold text-[var(--foreground)]">{formatLongDate(invoice.dueDate)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-8 md:grid-cols-2 py-8 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Bill To</p>
            <h2 className="text-base font-semibold text-[var(--foreground)] mb-2">
              {invoice.billTo.name || "Client Name"}
            </h2>
            <div className="space-y-1 text-sm text-[var(--muted)]">
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
              {invoice.billTo.email ? <p className="mt-1">{invoice.billTo.email}</p> : null}
            </div>
          </div>

          <div className="md:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Project</p>
            <p className="text-base font-medium text-[var(--foreground)]">
              {invoice.projectReference || "N/A"}
            </p>
          </div>
        </section>

        <section className="py-8 border-b border-[var(--border)]">
          <div className="hidden grid-cols-[1.5fr_0.5fr_0.5fr_0.5fr] gap-4 border-b border-[var(--border)] pb-3 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] md:grid">
            <p>Description</p>
            <p className="text-right">Qty</p>
            <p className="text-right">Rate</p>
            <p className="text-right">Amount</p>
          </div>

          <div className="space-y-4 md:space-y-0 md:divide-y md:divide-[var(--border)]">
            {invoice.lineItems.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-4 text-center md:text-left">No items added yet.</p>
            ) : null}
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="grid gap-2 md:py-4 md:grid-cols-[1.5fr_0.5fr_0.5fr_0.5fr] md:items-start md:gap-4 bg-[#fafbfb] md:bg-transparent p-3 rounded md:p-0 md:rounded-none">
                <div>
                  <p className="font-medium text-[var(--foreground)] text-sm">{item.description || "Item description"}</p>
                </div>
                <div className="flex justify-between md:block">
                  <span className="text-xs font-medium text-[var(--muted)] md:hidden">Qty</span>
                  <p className="text-sm text-[var(--foreground)] md:text-right">{item.quantity}</p>
                </div>
                <div className="flex justify-between md:block">
                  <span className="text-xs font-medium text-[var(--muted)] md:hidden">Rate</span>
                  <p className="text-sm text-[var(--foreground)] md:text-right">
                    {formatCurrency(item.unitPrice, invoice.currencyCode)}
                  </p>
                </div>
                <div className="flex justify-between md:block">
                  <span className="text-xs font-medium text-[var(--muted)] md:hidden">Amount</span>
                  <p className="text-sm font-semibold text-[var(--foreground)] md:text-right">
                    {formatCurrency(item.quantity * item.unitPrice, invoice.currencyCode)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-8 md:grid-cols-[1fr_minmax(280px,auto)]">
          <div className="space-y-8 order-2 md:order-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Payment Instructions</p>
              <div className="space-y-3">
                {invoice.paymentMethods.length > 0 ? (
                  invoice.paymentMethods.map((method) => (
                    <div key={method.id} className="text-sm">
                      <p className="font-medium text-[var(--foreground)] mb-1">
                        {method.label}
                        {method.preferred && <span className="ml-2 text-xs font-medium text-[var(--muted)] bg-[#fafbfb] px-1.5 py-0.5 rounded border border-[var(--border)]">Preferred</span>}
                      </p>
                      {method.details && <p className="text-[var(--muted)] whitespace-pre-wrap">{method.details}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">No instructions provided.</p>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-[var(--muted)] leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}

            {(invoice.companySnapshot.businessNumber || invoice.companySnapshot.taxRegistrations.length > 0) && (
              <div className="pt-6 border-t border-[var(--border)]">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted)]">
                  {invoice.companySnapshot.businessNumber && (
                    <p>BN: <span className="font-medium text-[var(--foreground)]">{invoice.companySnapshot.businessNumber}</span></p>
                  )}
                  {invoice.companySnapshot.taxRegistrations.map((registration) => (
                    <p key={registration.id}>
                      {registration.label}: <span className="font-medium text-[var(--foreground)]">{registration.number}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="order-1 md:order-2 bg-[#fafbfb] rounded-md p-6 border border-[var(--border)] self-start">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span className="font-medium text-[var(--foreground)]">{formatCurrency(totals.subtotalAmount, invoice.currencyCode)}</span>
              </div>
              {invoice.taxLines.map((tax) => (
                <div key={tax.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">
                    {tax.label} ({tax.rate}%)
                  </span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(totals.subtotalAmount * (tax.rate / 100), invoice.currencyCode)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Amount paid</span>
                <span className="font-medium text-[var(--foreground)]">{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--foreground)]">Balance due</span>
              <span className="text-2xl font-bold text-[var(--foreground)]">
                {formatCurrency(totals.balanceDue, invoice.currencyCode)}
              </span>
            </div>
            <p className="text-right text-xs text-[var(--muted)] mt-1">{invoice.currencyCode}</p>
          </div>
        </section>
      </div>
    </article>
  );
}