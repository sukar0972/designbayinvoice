"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  CircleDollarSign,
  Loader2,
  Plus,
  Save,
  Trash2,
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
      setMessage(error instanceof Error ? error.message : "Unable to save invoice.");
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
      setMessage(error instanceof Error ? error.message : "Unable to delete invoice.");
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
      setMessage(error instanceof Error ? error.message : "Unable to record payment.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[2.4rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]" href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--accent)]">Invoice workspace</p>
              <h1 className="display-font mt-3 text-4xl sm:text-5xl">
                {invoice.invoiceNumber || "New invoice draft"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                The company snapshot comes from settings. Existing invoices keep their own copy of the business profile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isNew ? (
              <Link className="btn btn-secondary" href={`/invoices/new?duplicate=${invoice.id}`}>
                Duplicate
              </Link>
            ) : null}
            <DownloadPdfButton className="btn btn-secondary" invoice={invoice} />
            {!isNew ? (
              <Link className="btn btn-secondary" href={`/invoices/${invoice.id}/print`} target="_blank">
                Print view
              </Link>
            ) : null}
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={() => startTransition(handleSave)}
              type="button"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isNew ? "Create invoice" : "Save changes"}
            </button>
          </div>
        </div>

        {message ? (
          <p className="mt-5 whitespace-pre-line rounded-2xl bg-[rgba(20,87,255,0.08)] px-4 py-3 text-sm font-semibold text-[var(--accent)]">
            {message}
          </p>
        ) : null}
      </section>

      <div className="print-shell-hidden card-surface flex rounded-full p-1 lg:hidden">
        <button
          className={`flex-1 rounded-full px-4 py-3 text-sm font-bold ${mobileTab === "edit" ? "bg-[var(--foreground)] text-white" : ""}`}
          onClick={() => setMobileTab("edit")}
          type="button"
        >
          Edit
        </button>
        <button
          className={`flex-1 rounded-full px-4 py-3 text-sm font-bold ${mobileTab === "preview" ? "bg-[var(--foreground)] text-white" : ""}`}
          onClick={() => setMobileTab("preview")}
          type="button"
        >
          Preview
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]">
        <section className={`space-y-5 ${mobileTab === "preview" ? "hidden lg:block" : ""}`}>
          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Meta</p>
                <h2 className="mt-2 text-2xl font-black">Invoice details</h2>
              </div>
              <span className="status-pill" data-status={invoice.status}>
                {STATUS_LABELS[invoice.status]}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="md:col-span-2">
                <label className="field-label">Project reference</label>
                <input className="field" value={invoice.projectReference} onChange={(event) => updateInvoiceField("projectReference", event.target.value)} />
              </div>
            </div>
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Client</p>
                <h2 className="mt-2 text-2xl font-black">Bill to</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
                <label className="field-label">Address line 1</label>
                <input className="field" value={invoice.billTo.address1} onChange={(event) => updateInvoiceField("billTo", { ...invoice.billTo, address1: event.target.value })} />
              </div>
              <div className="md:col-span-2">
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

          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Line items</p>
                <h2 className="mt-2 text-2xl font-black">Scope and pricing</h2>
              </div>
              <button className="btn btn-secondary" onClick={() => updateInvoiceField("lineItems", [...invoice.lineItems, createLineItem()])} type="button">
                <Plus className="h-4 w-4" />
                Add line
              </button>
            </div>
            <div className="space-y-4">
              {invoice.lineItems.map((item, index) => (
                <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-4" key={item.id}>
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.4fr_0.55fr_auto]">
                    <input className="field" placeholder="Description" value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} />
                    <input className="field" min="0" placeholder="Qty" step="0.25" type="number" value={item.quantity} onChange={(event) => updateLineItem(index, { quantity: Number(event.target.value) })} />
                    <input className="field" min="0" placeholder="Rate" step="0.01" type="number" value={item.unitPrice} onChange={(event) => updateLineItem(index, { unitPrice: Number(event.target.value) })} />
                    <button className="btn btn-danger" onClick={() => updateInvoiceField("lineItems", invoice.lineItems.filter((lineItem) => lineItem.id !== item.id))} type="button">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Tax lines</p>
                <h2 className="mt-2 text-2xl font-black">Manual Canadian tax rows</h2>
              </div>
              <button className="btn btn-secondary" onClick={() => updateInvoiceField("taxLines", [...invoice.taxLines, createTaxLine()])} type="button">
                <Plus className="h-4 w-4" />
                Add tax
              </button>
            </div>
            <div className="space-y-4">
              {invoice.taxLines.map((taxLine, index) => (
                <div className="grid gap-4 md:grid-cols-[1fr_0.45fr_auto]" key={taxLine.id}>
                  <input className="field" placeholder="Label" value={taxLine.label} onChange={(event) => updateTaxLine(index, { label: event.target.value })} />
                  <input className="field" min="0" placeholder="Rate %" step="0.01" type="number" value={taxLine.rate} onChange={(event) => updateTaxLine(index, { rate: Number(event.target.value) })} />
                  <button className="btn btn-danger" onClick={() => updateInvoiceField("taxLines", invoice.taxLines.filter((line) => line.id !== taxLine.id))} type="button">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Payments</p>
                <h2 className="mt-2 text-2xl font-black">Instructions and tracking</h2>
              </div>
            </div>
            <div className="space-y-4">
              {invoice.paymentMethods.map((method, index) => (
                <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-4" key={method.id}>
                  <div className="grid gap-4 md:grid-cols-[1fr_1.8fr_auto_auto]">
                    <input className="field" placeholder="Method label" value={method.label} onChange={(event) => updatePaymentMethod(index, { label: event.target.value })} />
                    <input className="field" placeholder="Payment instructions" value={method.details} onChange={(event) => updatePaymentMethod(index, { details: event.target.value })} />
                    <button className={`btn ${method.preferred ? "btn-primary" : "btn-secondary"}`} onClick={() => updateInvoiceField("paymentMethods", invoice.paymentMethods.map((item) => ({ ...item, preferred: item.id === method.id })))} type="button">
                      Preferred
                    </button>
                    <button className="btn btn-danger" onClick={() => updateInvoiceField("paymentMethods", invoice.paymentMethods.filter((item) => item.id !== method.id))} type="button">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
              <button className="btn btn-secondary" onClick={() => updateInvoiceField("paymentMethods", [...invoice.paymentMethods, createPaymentInstruction("Manual payment method")])} type="button">
                <Plus className="h-4 w-4" />
                Add payment method
              </button>
            </div>

            {!isNew && invoice.id ? (
              <div className="mt-6 rounded-[1.6rem] bg-[rgba(20,87,255,0.06)] p-4">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--accent)]">Record payment</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input className="field" min="0" placeholder="Amount" step="0.01" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                  <button className="btn btn-primary sm:min-w-[170px]" onClick={() => startTransition(handlePaymentRecord)} type="button">
                    <CircleDollarSign className="h-4 w-4" />
                    Apply payment
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Company snapshot</p>
                <h2 className="mt-2 text-2xl font-black">Pulled from settings</h2>
              </div>
              <Link className="btn btn-secondary" href="/settings">
                Edit defaults
              </Link>
            </div>

            <div className="rounded-[1.7rem] border border-[var(--border)] bg-white/80 p-4 text-sm leading-7 text-[var(--muted)]">
              <p className="font-black text-[var(--foreground)]">{invoice.companySnapshot.companyName || "Add your business profile in settings"}</p>
              <p>{[invoice.companySnapshot.address1, invoice.companySnapshot.address2].filter(Boolean).join(", ")}</p>
              <p>
                {[invoice.companySnapshot.city, invoice.companySnapshot.province, invoice.companySnapshot.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>{invoice.companySnapshot.email}</p>
            </div>
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <label className="field-label">Invoice notes</label>
            <textarea className="field min-h-[180px]" value={invoice.notes} onChange={(event) => updateInvoiceField("notes", event.target.value)} />
          </article>

          {!isNew && canDeleteInvoice(invoice.status) ? (
            <button className="btn btn-danger w-full justify-center" onClick={handleDeleteDraft} type="button">
              <Trash2 className="h-4 w-4" />
              Delete draft invoice
            </button>
          ) : null}
        </section>

        <section className={`space-y-5 ${mobileTab === "edit" ? "hidden lg:block" : ""}`}>
          <article className="card-surface rounded-[2rem] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Preview</p>
                <h2 className="mt-2 text-2xl font-black">Live invoice output</h2>
              </div>
              <div className="rounded-full bg-[rgba(255,127,50,0.12)] px-4 py-2 text-sm font-black text-[var(--accent-strong)]">
                {formatCurrency(totals.balanceDue, invoice.currencyCode)} due
              </div>
            </div>
            <InvoiceDocument invoice={deferredInvoice} />
          </article>

          <article className="card-surface rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(20,87,255,0.1)] text-[var(--accent)]">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Totals</p>
                <h3 className="text-xl font-black">Calculated live</h3>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-[1.6rem] bg-white/80 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span className="font-semibold">{formatCurrency(totals.subtotalAmount, invoice.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Tax</span>
                <span className="font-semibold">{formatCurrency(totals.taxAmount, invoice.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Amount paid</span>
                <span className="font-semibold">{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-black/10 pt-3 text-base font-black">
                <span>Balance due</span>
                <span>{formatCurrency(totals.balanceDue, invoice.currencyCode)}</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              New invoices inherit the profile for {profile.companyName || "your business"} and freeze it at save time so older invoices do not drift when settings change.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
