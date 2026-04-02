"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Pencil,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createInvoiceDraft, deleteDraftInvoice, recordPayment, updateInvoice } from "@/app/actions";
import { DownloadPdfButton } from "@/components/invoices/download-pdf-button";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { canDeleteInvoice, computeInvoiceTotals, formatCurrency } from "@/lib/invoices/calculations";
import { createLineItem, createPaymentInstruction, createTaxLine } from "@/lib/invoices/defaults";
import { STATUS_LABELS } from "@/lib/invoices/constants";
import type { BusinessProfileForm, InvoiceFormState, InvoiceRecord, LineItem, PaymentInstruction, TaxLine } from "@/types/domain";

type InvoiceEditorProps = {
  initialInvoice: InvoiceFormState | InvoiceRecord;
  profile: BusinessProfileForm;
  isNew: boolean;
};

export function InvoiceEditor({
  initialInvoice,
  profile,
  isNew,
}: InvoiceEditorProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceFormState | InvoiceRecord>(initialInvoice);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  const deferredInvoice = useDeferredValue(invoice);
  const totals = useMemo(() => computeInvoiceTotals(invoice), [invoice]);

  function updateInvoiceField<K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) {
    setInvoice((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLineItem(index: number, nextValue: Partial<LineItem>) {
    setInvoice((current) => {
      const nextItems = [...current.lineItems];
      nextItems[index] = { ...nextItems[index], ...nextValue };

      return {
        ...current,
        lineItems: nextItems,
      };
    });
  }

  function updateTaxLine(index: number, nextValue: Partial<TaxLine>) {
    setInvoice((current) => {
      const nextLines = [...current.taxLines];
      nextLines[index] = { ...nextLines[index], ...nextValue };

      return {
        ...current,
        taxLines: nextLines,
      };
    });
  }

  function updatePaymentMethod(index: number, nextValue: Partial<PaymentInstruction>) {
    setInvoice((current) => {
      const nextMethods = [...current.paymentMethods];
      nextMethods[index] = { ...nextMethods[index], ...nextValue };

      return {
        ...current,
        paymentMethods: nextMethods,
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      if (isNew) {
        const created = await createInvoiceDraft(invoice);
        router.replace(`/invoices/${created.id}`);
        router.refresh();
        return;
      }

      await updateInvoice({
        ...invoice,
        id: invoice.id!,
      });
      setMessage("Invoice saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }

    setSaving(false);
  }

  async function handleDeleteDraft() {
    if (!invoice.id || !window.confirm("Delete this draft invoice?")) {
      return;
    }

    try {
      await deleteDraftInvoice(invoice.id);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Deletion failed.");
    }
  }

  async function handlePaymentRecord() {
    if (!invoice.id || !paymentAmount) {
      return;
    }

    try {
      await recordPayment(invoice.id, Number(paymentAmount));
      setMessage("Payment recorded.");
      setPaymentAmount("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recording payment failed.");
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto relative pb-20 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 bg-[var(--background)] z-30 py-4 border-b border-[var(--border)] -mt-4 px-1 md:-mt-8 md:pt-8 mb-6">
        <div className="flex items-center gap-4">
          <Link className="p-2 -ml-2 rounded-md hover:bg-[#ebeef0] text-[var(--muted)] transition-colors" href="/dashboard" title="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="display-font text-xl font-semibold">
              {invoice.invoiceNumber || "New invoice draft"}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-[var(--muted)]">
              <span className="status-pill !py-0.5 !px-2 !text-[10px]" data-status={invoice.status}>
                {STATUS_LABELS[invoice.status]}
              </span>
              <span>•</span>
              <span>{formatCurrency(totals.balanceDue, invoice.currencyCode)} due</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <Link className="btn btn-secondary shadow-sm" href={`/invoices/${invoice.id}/print`} target="_blank">
              Print
            </Link>
          )}
          <DownloadPdfButton className="btn btn-secondary shadow-sm" invoice={invoice} />
          <button
            className="btn btn-primary shadow-sm"
            disabled={saving}
            onClick={() => startTransition(handleSave)}
            type="button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {isNew ? "Create draft" : "Save"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-[#e0f2fe] p-4 border border-[#bae6fd]">
          <p className="text-sm font-medium text-[#006eb3]">{message}</p>
        </div>
      )}

      {/* Mobile Tabs */}
      <div className="print-shell-hidden md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-3 flex gap-2 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${mobileTab === "edit" ? "bg-[var(--accent)] text-white" : "bg-[#f4f6f8] text-[var(--foreground)]"}`}
          onClick={() => setMobileTab("edit")}
          type="button"
        >
          <Pencil className="h-4 w-4" /> Edit
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${mobileTab === "preview" ? "bg-[var(--accent)] text-white" : "bg-[#f4f6f8] text-[var(--foreground)]"}`}
          onClick={() => setMobileTab("preview")}
          type="button"
        >
          <Eye className="h-4 w-4" /> Preview
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(350px,400px)] xl:grid-cols-[1fr_minmax(450px,0.85fr)] items-start">
        {/* Editor Column */}
        <section className={`space-y-6 ${mobileTab === "preview" ? "hidden md:block" : ""}`}>
          
          <article className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb]">
              <h2 className="text-base font-semibold">Details</h2>
            </div>
            <div className="p-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Status</label>
                <select className="field" value={invoice.status} onChange={(event) => updateInvoiceField("status", event.target.value as InvoiceFormState["status"])}>
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="partially_paid">Partially paid</option>
                  <option value="paid">Paid</option>
                  <option value="void">Void</option>
                </select>
              </div>
              <div>
                <label className="field-label">Currency</label>
                <select className="field" value={invoice.currencyCode} onChange={(event) => updateInvoiceField("currencyCode", event.target.value as InvoiceFormState["currencyCode"])}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="field-label">Issue date</label>
                <input className="field" type="date" value={invoice.issueDate} onChange={(event) => updateInvoiceField("issueDate", event.target.value)} />
              </div>
              <div>
                <label className="field-label">Due date</label>
                <input className="field" type="date" value={invoice.dueDate} onChange={(event) => updateInvoiceField("dueDate", event.target.value)} />
              </div>
              <div className="sm:col-span-2 border-t border-[var(--border)] pt-4 mt-1">
                <label className="field-label">Project reference</label>
                <input className="field" value={invoice.projectReference} onChange={(event) => updateInvoiceField("projectReference", event.target.value)} placeholder="E.g. Website redesign" />
              </div>
            </div>
          </article>

          <article className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb]">
              <h2 className="text-base font-semibold">Bill to</h2>
            </div>
            <div className="p-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label">Client name</label>
                <input className="field" value={invoice.billTo.name} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, name: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Attention</label>
                <input className="field" value={invoice.billTo.attention ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, attention: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field" value={invoice.billTo.email ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, email: event.target.value })} />
              </div>
              <div className="sm:col-span-2 border-t border-[var(--border)] pt-4 mt-2">
                <label className="field-label">Address line 1</label>
                <input className="field" value={invoice.billTo.address1} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, address1: event.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Address line 2</label>
                <input className="field" value={invoice.billTo.address2 ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, address2: event.target.value })} />
              </div>
              <div>
                <label className="field-label">City</label>
                <input className="field" value={invoice.billTo.city ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, city: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Province</label>
                <input className="field" value={invoice.billTo.province ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, province: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Postal code</label>
                <input className="field" value={invoice.billTo.postalCode ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, postalCode: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Country</label>
                <input className="field" value={invoice.billTo.country ?? ""} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, country: event.target.value })} />
              </div>
            </div>
          </article>

          <article className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
              <h2 className="text-base font-semibold">Line items</h2>
            </div>
            <div className="p-0">
              {invoice.lineItems.length === 0 ? (
                 <div className="p-8 text-center border-b border-[var(--border)]">
                   <p className="text-sm text-[var(--muted)]">No line items added.</p>
                 </div>
              ) : (
                <div className="divide-y divide-[var(--border)] border-b border-[var(--border)]">
                  {invoice.lineItems.map((item, index) => (
                    <div className="p-5 bg-white" key={item.id}>
                      <div className="flex flex-col gap-3">
                        <input className="field" placeholder="Description" value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} />
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <input className="field" min="0" placeholder="Qty" step="0.25" type="number" value={item.quantity} onChange={(event) => updateLineItem(index, { quantity: Number(event.target.value) })} />
                          </div>
                          <div className="flex-1">
                            <input className="field" min="0" placeholder="Rate" step="0.01" type="number" value={item.unitPrice} onChange={(event) => updateLineItem(index, { unitPrice: Number(event.target.value) })} />
                          </div>
                          <button className="btn btn-secondary !p-2 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1]" onClick={() => updateInvoiceField("lineItems", invoice.lineItems.filter((lineItem) => lineItem.id !== item.id))} type="button" title="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-4 bg-[#fafbfb]">
                <button className="btn btn-secondary text-xs shadow-sm" onClick={() => updateInvoiceField("lineItems", [...invoice.lineItems, createLineItem()])} type="button">
                  <Plus className="h-3 w-3 mr-1.5" />
                  Add item
                </button>
              </div>
            </div>
          </article>

          <article className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
              <h2 className="text-base font-semibold">Taxes</h2>
              <button className="btn btn-secondary text-xs !py-1 !px-2 shadow-sm" onClick={() => updateInvoiceField("taxLines", [...invoice.taxLines, createTaxLine()])} type="button">
                Add tax
              </button>
            </div>
            <div className="p-5">
              {invoice.taxLines.length === 0 ? (
                <p className="text-sm text-[var(--muted)] text-center py-4">No taxes applied.</p>
              ) : (
                <div className="space-y-3">
                  {invoice.taxLines.map((taxLine, index) => (
                    <div className="flex items-start gap-3" key={taxLine.id}>
                      <div className="flex-1">
                        <input className="field" placeholder="Label (e.g. HST)" value={taxLine.label} onChange={(event) => updateTaxLine(index, { label: event.target.value })} />
                      </div>
                      <div className="flex-[0.5]">
                        <input className="field" min="0" placeholder="Rate %" step="0.01" type="number" value={taxLine.rate} onChange={(event) => updateTaxLine(index, { rate: Number(event.target.value) })} />
                      </div>
                      <button className="btn btn-secondary !p-2 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1]" onClick={() => updateInvoiceField("taxLines", invoice.taxLines.filter((line) => line.id !== taxLine.id))} type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
              <h2 className="text-base font-semibold">Payments</h2>
              <button className="btn btn-secondary text-xs !py-1 !px-2 shadow-sm" onClick={() => updateInvoiceField("paymentMethods", [...invoice.paymentMethods, createPaymentInstruction("Manual payment")])} type="button">
                Add method
              </button>
            </div>
            <div className="p-5">
              {invoice.paymentMethods.length === 0 ? (
                <p className="text-sm text-[var(--muted)] text-center py-4 mb-4">No payment methods added.</p>
              ) : (
                <div className="space-y-4 mb-6">
                  {invoice.paymentMethods.map((method, index) => (
                    <div className="p-4 rounded-md border border-[var(--border)] bg-[#fafbfb]" key={method.id}>
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <input className="field bg-white" placeholder="Method label" value={method.label} onChange={(event) => updatePaymentMethod(index, { label: event.target.value })} />
                          <input className="field bg-white" placeholder="Instructions" value={method.details} onChange={(event) => updatePaymentMethod(index, { details: event.target.value })} />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button className={`btn text-xs !py-1.5 ${method.preferred ? "btn-primary shadow-sm" : "btn-secondary shadow-sm"}`} onClick={() => updateInvoiceField("paymentMethods", invoice.paymentMethods.map((item) => ({ ...item, preferred: item.id === method.id })))} type="button">
                            Preferred
                          </button>
                          <button className="btn btn-secondary text-xs !py-1.5 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1] shadow-sm" onClick={() => updateInvoiceField("paymentMethods", invoice.paymentMethods.filter((item) => item.id !== method.id))} type="button">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isNew && invoice.id ? (
                <div className="border-t border-[var(--border)] pt-5 mt-2">
                  <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Record payment</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input className="field" min="0" placeholder="Amount received" step="0.01" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                    <button className="btn btn-primary shadow-sm whitespace-nowrap" onClick={() => startTransition(handlePaymentRecord)} type="button">
                      Record payment
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <article className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb]">
              <h2 className="text-base font-semibold">Notes</h2>
            </div>
            <div className="p-5">
              <textarea className="field min-h-[120px]" placeholder="Additional notes..." value={invoice.notes} onChange={(event) => updateInvoiceField("notes", event.target.value)} />
            </div>
          </article>

          {!isNew && canDeleteInvoice(invoice.status) ? (
            <button className="btn btn-danger w-full shadow-sm" onClick={handleDeleteDraft} type="button">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete draft invoice
            </button>
          ) : null}
        </section>

        {/* Preview Column */}
        <section className={`space-y-6 ${mobileTab === "edit" ? "hidden md:block" : ""}`}>
          <div className="sticky top-28">
            <article className="card-surface overflow-hidden mb-6 hidden md:block">
              <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb] flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Live preview</h2>
                <Link href={`/invoices/${invoice.id}/print`} target="_blank" className="text-xs text-[var(--accent)] hover:underline font-medium">Open in new tab</Link>
              </div>
              <div className="p-0 bg-[#ebeef0] flex justify-center py-8 px-4 overflow-hidden h-[calc(100vh-280px)] overflow-y-auto">
                <div className="scale-[0.65] lg:scale-[0.75] origin-top md:origin-top w-[860px] pointer-events-none select-none">
                  <InvoiceDocument invoice={deferredInvoice} />
                </div>
              </div>
            </article>

            {/* Mobile Preview View */}
            <div className="md:hidden">
              <InvoiceDocument invoice={deferredInvoice} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}