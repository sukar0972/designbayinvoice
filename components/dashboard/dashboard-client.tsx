"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Copy, FilePlus2, Trash2, Search, MoreHorizontal } from "lucide-react";
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
    <article className="card-surface p-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
        <p className="display-font text-3xl font-semibold text-[var(--foreground)]">{value}</p>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">{copy}</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="display-font text-2xl font-semibold">Overview</h1>
        <Link className="btn btn-primary shadow-sm" href="/invoices/new">
          <FilePlus2 className="h-4 w-4 mr-1.5" />
          Create invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          copy="Total unpaid balance"
          label="Outstanding"
          value={formatCurrency(stats.outstanding, defaultCurrency)}
        />
        <StatCard
          copy="Total payments received"
          label="Collected"
          value={formatCurrency(stats.paid, defaultCurrency)}
        />
        <StatCard
          copy="Invoices past due"
          label="Overdue"
          value={String(stats.overdue)}
        />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafbfb]">
          <h2 className="text-base font-semibold">Recent invoices</h2>
        </div>

        {message && (
          <div className="px-5 py-3 bg-[#e0f2fe] border-b border-[#bae6fd]">
            <p className="text-sm font-medium text-[#006eb3]">{message}</p>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-[#f4f6f8] flex items-center justify-center mb-4 text-[var(--muted)]">
              <FilePlus2 className="h-6 w-6" />
            </div>
            <p className="text-base font-medium text-[var(--foreground)]">No invoices found</p>
            <p className="mt-1 text-sm text-[var(--muted)] max-w-sm">
              Create your first invoice to track your payments and view it as a PDF.
            </p>
            <Link className="btn btn-secondary mt-6 shadow-sm" href="/invoices/new">
              Create invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[#fafbfb]">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#fafbfb] transition-colors group">
                    <td className="px-5 py-4 align-middle">
                      <div className="flex flex-col">
                        <Link href={`/invoices/${invoice.id}`} className="font-semibold text-[var(--foreground)] hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                        <span className="text-xs text-[var(--muted)] mt-1">Due {invoice.dueDate}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--foreground)]">{invoice.billTo.name || "Unknown"}</span>
                        <span className="text-xs text-[var(--muted)] mt-1">{invoice.projectReference || "No project"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle font-medium text-[var(--foreground)]">
                      {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="status-pill" data-status={invoice.status}>
                          {STATUS_LABELS[invoice.status]}
                        </span>
                        {isOverdue(invoice) && (
                          <span className="text-xs font-medium text-[#d82c0d] bg-[#fed3d1] px-2 py-0.5 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                        <DownloadPdfButton className="btn btn-secondary !p-1.5 shadow-sm" invoice={invoice} />
                        <Link className="btn btn-secondary !p-1.5 shadow-sm" href={`/invoices/new?duplicate=${invoice.id}`} title="Duplicate">
                          <Copy className="h-4 w-4 text-[var(--muted)]" />
                        </Link>
                        {invoice.status === "draft" && (
                          <button
                            className="btn btn-secondary !p-1.5 shadow-sm text-[#d82c0d] hover:bg-[#fed3d1] hover:border-[#fed3d1]"
                            disabled={pending}
                            onClick={() => {
                              if (window.confirm("Delete draft invoice?")) {
                                startTransition(async () => {
                                  try {
                                    await deleteDraftInvoice(invoice.id);
                                    setMessage(`Deleted ${invoice.invoiceNumber}`);
                                    router.refresh();
                                  } catch (error) {
                                    setMessage(error instanceof Error ? error.message : "Error deleting draft");
                                  }
                                });
                              }
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}