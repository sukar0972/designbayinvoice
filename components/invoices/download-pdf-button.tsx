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
  getPrintHref?: () => string | undefined | Promise<string | undefined>;
  pdfHref?: string;
  printHref?: string;
};

export function DownloadPdfButton({
  invoice,
  className,
  label = "Download PDF",
  getPrintHref,
  pdfHref,
  printHref,
}: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedPdfHref = pdfHref ?? (invoice.id ? `/api/invoices/${invoice.id}/pdf` : undefined);

  async function handleDownload() {
    if (getPrintHref) {
      await getPrintHref();
    } else if (printHref) {
      void printHref;
    }

    if (resolvedPdfHref) {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(resolvedPdfHref, {
          credentials: "include",
        });

        if (!response.ok) {
          let message = `PDF generation failed with ${response.status}.`;

          try {
            const payload = (await response.json()) as { error?: string };
            if (payload.error) {
              message = payload.error;
            }
          } catch {
            // Ignore JSON parse failures and keep the default message.
          }

          throw new Error(message);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const contentDisposition = response.headers.get("content-disposition");
        const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);

        link.href = objectUrl;
        link.download = filenameMatch?.[1] ?? "invoice.pdf";
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        return;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to generate the PDF for this invoice.",
        );
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!containerRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      if ("fonts" in document) {
        await document.fonts.ready;
      }

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
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          width: block.scrollWidth,
          height: block.scrollHeight,
          windowWidth: 1280,
          windowHeight: Math.max(1800, containerRef.current.scrollHeight),
          scrollX: 0,
          scrollY: 0,
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
        className="pointer-events-none fixed left-[-300vw] top-0 z-[-1] w-[980px] bg-white"
        data-pdf-capture-root
        ref={containerRef}
      >
        <InvoiceDocument invoice={invoice} printable />
      </div>
    </>
  );
}
