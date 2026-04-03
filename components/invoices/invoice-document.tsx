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
      className={`mx-auto bg-white text-[#111827] ${
        printable
          ? "invoice-document w-[210mm] max-w-none px-4"
          : "max-w-[1000px] rounded-lg shadow-sm border border-[#e5e7eb] overflow-hidden"
      }`}
    >
      <div className={`${printable ? "p-4" : "p-8 sm:p-10 md:p-12"}`}>
        {/* Header Grid: Company Info | Bill To | Invoice Details */}
        <header className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b-2 border-[#111827]" data-pdf-block>
          {/* Column 1: Company Info */}
          <div className="flex flex-col gap-4">
            {invoice.companySnapshot.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${invoice.companySnapshot.companyName} logo`}
                className="h-14 w-14 object-contain"
                src={invoice.companySnapshot.logoUrl}
              />
            ) : null}
            <div className="text-sm text-[#4b5563] space-y-0.5">
              <p className="font-bold text-[#111827] text-base mb-1">{invoice.companySnapshot.companyName || "Your Company"}</p>
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
              {invoice.companySnapshot.email ? <p className="mt-2 text-[#111827]">{invoice.companySnapshot.email}</p> : null}
              {invoice.companySnapshot.phone ? <p className="text-[#111827]">{invoice.companySnapshot.phone}</p> : null}
            </div>
          </div>

          {/* Column 2: Bill To & Project */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-1.5">Billed To</p>
              <h2 className="text-base font-bold text-[#111827] mb-1">
                {invoice.billTo.name || "Client Name"}
              </h2>
              <div className="space-y-0.5 text-sm text-[#4b5563]">
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
                {invoice.billTo.email ? <p className="mt-1 text-[#111827]">{invoice.billTo.email}</p> : null}
              </div>
            </div>

            {invoice.projectReference && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-1">Project</p>
                <p className="text-sm font-semibold text-[#111827]">{invoice.projectReference}</p>
              </div>
            )}
          </div>

          {/* Column 3: Invoice Meta */}
          <div className="flex flex-col sm:items-end text-left sm:text-right">
            <h1 className="text-4xl font-bold tracking-tight text-[#111827] uppercase mb-1">Invoice</h1>
            <p className="text-lg font-medium text-[#4b5563] mb-5">
              #{invoice.invoiceNumber || "Pending"}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-2 w-full sm:w-auto text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-end sm:gap-4 items-start sm:items-center">
                <span className="text-[#6b7280] font-medium">Date</span>
                <span className="font-semibold text-[#111827] sm:min-w-[100px]">{formatLongDate(invoice.issueDate)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end sm:gap-4 items-start sm:items-center">
                <span className="text-[#6b7280] font-medium">Due Date</span>
                <span className="font-semibold text-[#111827] sm:min-w-[100px]">{formatLongDate(invoice.dueDate)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end sm:gap-4 items-start sm:items-center">
                <span className="text-[#6b7280] font-medium">Currency</span>
                <span className="font-semibold text-[#111827] sm:min-w-[100px]">{invoice.currencyCode}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end sm:gap-4 items-start sm:items-center mt-1">
                <span className="text-[#6b7280] font-medium mt-1">Status</span>
                <span className="font-bold uppercase tracking-wider text-[11px] border border-[#111827] px-2 py-0.5 rounded text-center sm:min-w-[100px]">
                  {STATUS_LABELS[invoice.status]}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Line Items Table */}
        <section className="py-6" data-pdf-block>
          <div className="grid grid-cols-[2fr_0.5fr_0.75fr_0.75fr] gap-4 border-b border-[#111827] pb-2 text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-3">
            <p>Description</p>
            <p className="text-right">Qty</p>
            <p className="text-right">Rate</p>
            <p className="text-right">Amount</p>
          </div>

          <div className="space-y-0.5">
            {invoice.lineItems.length === 0 ? (
              <p className="text-sm text-[#6b7280] py-4 text-center italic">No items added yet.</p>
            ) : null}
            
            {invoice.lineItems.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-[2fr_0.5fr_0.75fr_0.75fr] gap-4 py-2.5 items-center ${
                  index !== invoice.lineItems.length - 1 ? "border-b border-[#e5e7eb]" : ""
                }`}
              >
                <p className="font-medium text-[#111827] text-sm leading-snug pr-4 break-words">
                  {item.description || "Item description"}
                </p>
                <p className="text-sm text-[#4b5563] text-right">{item.quantity}</p>
                <p className="text-sm text-[#4b5563] text-right">
                  {formatCurrency(item.unitPrice, invoice.currencyCode)}
                </p>
                <p className="text-sm font-bold text-[#111827] text-right">
                  {formatCurrency(item.quantity * item.unitPrice, invoice.currencyCode)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer: Split Notes/Payments and Totals */}
        <section className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(260px,auto)] gap-10 pt-6 border-t-2 border-[#111827]" data-pdf-block>
          
          {/* Left: Notes & Info */}
          <div className="space-y-6 order-2 sm:order-1">
            {invoice.paymentMethods.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-2">Payment Instructions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {invoice.paymentMethods.map((method) => (
                    <div key={method.id} className="text-sm text-[#4b5563]">
                      <p className="font-bold text-[#111827] mb-0.5">{method.label}</p>
                      {method.details && <p className="whitespace-pre-wrap leading-snug text-[13px]">{method.details}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invoice.notes && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-2">Notes</p>
                <p className="whitespace-pre-wrap text-[13px] text-[#4b5563] leading-snug">
                  {invoice.notes}
                </p>
              </div>
            )}

            {(invoice.companySnapshot.businessNumber || invoice.companySnapshot.taxRegistrations.length > 0) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-2">Registration</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#4b5563]">
                  {invoice.companySnapshot.businessNumber && (
                    <p>BN: <span className="font-semibold text-[#111827]">{invoice.companySnapshot.businessNumber}</span></p>
                  )}
                  {invoice.companySnapshot.taxRegistrations.map((registration) => (
                    <p key={registration.id}>
                      {registration.label}: <span className="font-semibold text-[#111827]">{registration.number}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Totals */}
          <div className="order-1 sm:order-2 self-start">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#4b5563] font-medium">Subtotal</span>
                <span className="font-semibold text-[#111827]">{formatCurrency(totals.subtotalAmount, invoice.currencyCode)}</span>
              </div>
              
              {invoice.taxLines.map((tax) => (
                <div key={tax.id} className="flex justify-between items-center py-1">
                  <span className="text-[#4b5563] font-medium">
                    {tax.label} ({tax.rate}%)
                  </span>
                  <span className="font-semibold text-[#111827]">
                    {formatCurrency(totals.subtotalAmount * (tax.rate / 100), invoice.currencyCode)}
                  </span>
                </div>
              ))}
              
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-[#e5e7eb] pb-2">
                  <span className="text-[#4b5563] font-medium">Amount Paid</span>
                  <span className="font-semibold text-[#111827]">-{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</span>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t-2 border-[#111827] flex items-end justify-between">
              <span className="text-sm font-bold uppercase tracking-wider text-[#111827]">Balance Due</span>
              <span className="text-2xl font-bold text-[#111827] leading-none">
                {formatCurrency(totals.balanceDue, invoice.currencyCode)}
              </span>
            </div>
          </div>
          
        </section>
      </div>
    </article>
  );
}