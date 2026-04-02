"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Copy, FilePlus2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteDraftInvoice } from "@/app/actions";
import { DownloadPdfButton } from "@/components/invoices/download-pdf-button";
import { formatCurrency, isOverdue } from "@/lib/invoices/calculations";
import { STATUS_LABELS } from "@/lib/invoices/constants";
import type { InvoiceRecord } from "@/types/domain";

type DashboardClientProps = {
  invoices: InvoiceRecord[];
  defaultCurrency: "CAD" | "USD";
};

function StatCard({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <article className="card-surface rounded-[1.9rem] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
      <p className="display-font mt-4 text-4xl">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy}</p>
    </article>
  );
}

export function DashboardClient({
  invoices,
  defaultCurrency,
}: DashboardClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    const paid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    const overdue = invoices.filter(isOverdue).length;

    return {
      outstanding,
      paid,
      overdue,
    };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <section className="card-surface rounded-[2.4rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--accent)]">Workspace overview</p>
            <h1 className="display-font mt-4 text-4xl sm:text-5xl">Invoice flow without the accounting-suite baggage.</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)] sm:text-base">
              Start from settings, generate invoices, and keep the output polished enough to send directly to clients.
            </p>
          </div>
          <Link className="btn btn-primary self-start px-6 py-4" href="/invoices/new">
            <FilePlus2 className="h-4 w-4" />
            Create invoice
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <StatCard
          copy="Current unpaid or partially paid balances across all invoices."
          label="Outstanding"
          value={formatCurrency(stats.outstanding, defaultCurrency)}
        />
        <StatCard
          copy="Total payments recorded against invoices in this workspace."
          label="Collected"
          value={formatCurrency(stats.paid, defaultCurrency)}
        />
        <StatCard
          copy="Invoices past the due date and still waiting on payment."
          label="Overdue"
          value={String(stats.overdue)}
        />
      </section>

      <section className="card-surface rounded-[2.4rem] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">Invoices</p>
            <h2 className="mt-2 text-2xl font-black">Recent activity</h2>
          </div>
        </div>

        {message ? (
          <p className="mb-4 rounded-2xl bg-[rgba(20,87,255,0.08)] px-4 py-3 text-sm font-semibold text-[var(--accent)]">
            {message}
          </p>
        ) : null}

        {invoices.length === 0 ? (
          <div className="rounded-[1.8rem] border border-dashed border-[var(--border)] bg-white/70 px-6 py-10 text-center">
            <p className="text-lg font-black">No invoices yet</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Create your first invoice to test the full mobile-to-PDF workflow.
            </p>
            <Link className="btn btn-primary mt-6" href="/invoices/new">
              Create invoice
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <article
                className="rounded-[1.9rem] border border-[var(--border)] bg-white/80 p-5"
                key={invoice.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-black">{invoice.invoiceNumber}</p>
                      <span className="status-pill" data-status={invoice.status}>
                        {STATUS_LABELS[invoice.status]}
                      </span>
                      {isOverdue(invoice) ? (
                        <span className="rounded-full bg-[rgba(199,75,75,0.12)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--danger)]">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                      {invoice.billTo.name || "Unnamed client"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {invoice.projectReference || "No project reference"} · Due {invoice.dueDate}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-6">
                    <div>
                      <p className="font-black uppercase tracking-[0.18em] text-[var(--muted)]">Total</p>
                      <p className="mt-1 font-semibold">{formatCurrency(invoice.totalAmount, invoice.currencyCode)}</p>
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-[0.18em] text-[var(--muted)]">Paid</p>
                      <p className="mt-1 font-semibold">{formatCurrency(invoice.amountPaid, invoice.currencyCode)}</p>
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-[0.18em] text-[var(--muted)]">Balance</p>
                      <p className="mt-1 font-semibold">{formatCurrency(invoice.balanceDue, invoice.currencyCode)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link className="btn btn-secondary" href={`/invoices/${invoice.id}`}>
                    Open invoice
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link className="btn btn-secondary" href={`/invoices/new?duplicate=${invoice.id}`}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Link>
                  <DownloadPdfButton className="btn btn-secondary" invoice={invoice} />
                  {invoice.status === "draft" ? (
                    <button
                      className="btn btn-danger"
                      disabled={pending}
                      onClick={() => {
                        const confirmed = window.confirm("Delete this draft invoice?");
                        if (!confirmed) {
                          return;
                        }

                        startTransition(async () => {
                          try {
                            await deleteDraftInvoice(invoice.id);
                            setMessage(`Deleted ${invoice.invoiceNumber}.`);
                            router.refresh();
                          } catch (error) {
                            setMessage(
                              error instanceof Error ? error.message : "Unable to delete this invoice.",
                            );
                          }
                        });
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete draft
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
