"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { AutoPrint } from "@/components/invoices/auto-print";
import { buildGuestPrintStorageKey } from "@/lib/invoices/guest-print";
import type { InvoiceFormState } from "@/types/domain";

function readDraftFromStorage(draftKey: string | null) {
  if (!draftKey || typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(buildGuestPrintStorageKey(draftKey));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as InvoiceFormState;
  } catch {
    return null;
  }
}

export function GuestPrintView() {
  const searchParams = useSearchParams();
  const draftKey = searchParams.get("draft");
  const shouldAutoPrint = searchParams.get("autoprint") === "1";
  const invoice = useMemo(() => readDraftFromStorage(draftKey), [draftKey]);

  if (!invoice) {
    return (
      <main className="min-h-screen bg-white px-4 py-12 text-[#111827]">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
          <h1 className="display-font text-3xl font-semibold">Guest print draft not found</h1>
          <p className="mt-4 text-sm text-[#6b7280]">
            This guest invoice only exists in the browser tab that created it. Go back to the
            guest composer and try again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 print:px-0 print:py-0">
      {shouldAutoPrint ? <AutoPrint /> : null}
      <div className="mx-auto max-w-[190mm] print:max-w-none">
        <InvoiceDocument invoice={invoice} printable />
      </div>
    </main>
  );
}
