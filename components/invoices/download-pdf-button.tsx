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

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 12;
      const contentWidth = pdfWidth - pageMargin * 2;
      const contentHeight = pdfHeight - pageMargin * 2;

      const blocks = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-pdf-block]"),
      );

      if (blocks.length === 0) {
        throw new Error("No printable invoice sections were found.");
      }

      let cursorY = pageMargin;

      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index];
        const canvas = await html2canvas(block, {
          scale: 2, // Higher scale for better text resolution
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          windowWidth: 1024, // Force desktop breakpoints
        });

        const imageData = canvas.toDataURL("image/png");
        const imageProperties = pdf.getImageProperties(imageData);
        const blockHeight = (imageProperties.height * contentWidth) / imageProperties.width;

        if (blockHeight <= contentHeight) {
          if (cursorY > pageMargin && cursorY + blockHeight > pdfHeight - pageMargin) {
            pdf.addPage();
            cursorY = pageMargin;
          }

          pdf.addImage(imageData, "PNG", pageMargin, cursorY, contentWidth, blockHeight);
          cursorY += blockHeight;
          continue;
        }

        if (cursorY > pageMargin) {
          pdf.addPage();
          cursorY = pageMargin;
        }

        let consumedHeight = 0;

        while (consumedHeight < blockHeight) {
          pdf.addImage(
            imageData,
            "PNG",
            pageMargin,
            pageMargin - consumedHeight,
            contentWidth,
            blockHeight,
          );
          consumedHeight += contentHeight;

          if (consumedHeight < blockHeight) {
            pdf.addPage();
          }
        }

        const remainder = blockHeight % contentHeight;
        cursorY = remainder === 0 ? pdfHeight - pageMargin : pageMargin + remainder;
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
      <div
        className="pointer-events-none fixed left-[-300vw] top-0 z-[-1] w-[800px] bg-white"
        ref={containerRef}
      >
        <InvoiceDocument invoice={invoice} printable />
      </div>
    </>
  );
}
