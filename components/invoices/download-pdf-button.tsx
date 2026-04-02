"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import type { InvoiceFormState, InvoiceRecord } from "@/types/domain";
import { InvoiceDocument } from "@/components/invoices/invoice-document";

type DownloadPdfButtonProps = {
  invoice: InvoiceFormState | InvoiceRecord;
  className?: string;
  label?: string;
};

export function DownloadPdfButton({
  invoice,
  className,
  label = "Download PDF",
}: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    if (!containerRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 80));

      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: containerRef.current.scrollWidth,
        height: containerRef.current.scrollHeight,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imageProperties = pdf.getImageProperties(imageData);
      const imageHeight = (imageProperties.height * pdfWidth) / imageProperties.width;

      let heightLeft = imageHeight;
      let position = 0;

      pdf.addImage(imageData, "PNG", 0, position, pdfWidth, imageHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, position, pdfWidth, imageHeight);
        heightLeft -= pdfHeight;
      }

      const safeNumber = (invoice.invoiceNumber || "invoice").replace(/[^a-z0-9_-]/gi, "_");
      const safeName = (invoice.billTo.name || "client").replace(/[^a-z0-9_-]/gi, "_");
      pdf.save(`${safeNumber}_${safeName}.pdf`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate the PDF for this invoice.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <button
          className={className ?? "btn btn-secondary"}
          disabled={loading}
          onClick={handleDownload}
          type="button"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {label}
        </button>
        {error ? <p className="text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      </div>
      <div className="pointer-events-none fixed left-[-300vw] top-0 z-[-1] w-[210mm] bg-white" ref={containerRef}>
        <InvoiceDocument invoice={invoice} printable />
      </div>
    </>
  );
}
