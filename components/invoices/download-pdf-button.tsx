"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2 } from "lucide-react";

import type { InvoiceFormState, InvoiceRecord } from "@/types/domain";

const BrowserPdfInvoiceDocument = dynamic(
  () => import("@/components/invoices/invoice-document").then((mod) => mod.InvoiceDocument),
  { ssr: false },
);

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
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedPdfHref = pdfHref ?? (invoice.id ? `/api/invoices/${invoice.id}/pdf` : undefined);
  const needsBrowserPdfFallback = !resolvedPdfHref;

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    setProgress(12);

    const intervalId = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }

        const remaining = 100 - current;
        const increment = Math.max(3, Math.round(remaining * 0.12));
        return Math.min(92, current + increment);
      });
    }, 350);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading]);

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
        setProgress(100);
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

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
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
      setProgress(100);
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
        {loading ? (
          <div
            aria-live="polite"
            className="w-full max-w-xs rounded-md border border-[var(--border)] bg-white px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-[var(--muted)]">
              <span>Generating PDF...</span>
              <span>{progress}%</span>
            </div>
            <div
              aria-hidden="true"
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]"
            >
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm font-medium text-[var(--danger)]">{error}</p> : null}
      </div>
      {needsBrowserPdfFallback ? (
        <div
          className="pointer-events-none fixed left-[-300vw] top-0 z-[-1] w-[980px] bg-white"
          data-pdf-capture-root
          ref={containerRef}
        >
          <BrowserPdfInvoiceDocument invoice={invoice} printable />
        </div>
      ) : null}
    </>
  );
}
