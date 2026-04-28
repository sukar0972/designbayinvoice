"use client";

import { Eye } from "lucide-react";

export function ExampleInvoiceButton() {
  return (
    <button
      className="btn btn-secondary px-6 py-3 text-base"
      onClick={() => {
        window.open(`/example-invoice?ts=${Date.now()}`, "_blank", "noopener,noreferrer");
      }}
      type="button"
    >
      <Eye className="h-4 w-4" />
      Preview example invoice
    </button>
  );
}
