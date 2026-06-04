import { NextResponse } from "next/server";

import { requireOrganizationContext } from "@/lib/organizations/data";
import { getInvoiceById } from "@/lib/invoices/data";
import { launchPdfBrowser } from "@/lib/pdf/browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await requireOrganizationContext();
    const invoice = await getInvoiceById(id);

    const requestUrl = new URL(request.url);
    const printUrl = new URL(`/invoices/${id}/print`, requestUrl.origin);
    const cookieHeader = request.headers.get("cookie") ?? "";

    let browser: Awaited<ReturnType<typeof launchPdfBrowser>> | null = null;

    try {
      browser = await launchPdfBrowser();
      const page = await browser.newPage();

      if (cookieHeader) {
        await page.setExtraHTTPHeaders({
          cookie: cookieHeader,
        });
      }

      await page.goto(printUrl.toString(), {
        waitUntil: "networkidle0",
        timeout: 30_000,
      });

      await page.waitForSelector(".invoice-document", {
        timeout: 10_000,
      });

      await page.emulateMediaType("print");

      await page.evaluate(async () => {
        if ("fonts" in document) {
          await document.fonts.ready;
        }

        await Promise.all(
          Array.from(document.images, (image) => {
            if (image.complete) {
              return Promise.resolve();
            }

            return new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            });
          }),
        );
      });

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
      });

      const safeNumber = (invoice.invoiceNumber || "invoice").replace(/[^a-z0-9_-]/gi, "_");
      const safeName = (invoice.billTo?.name || "client").replace(/[^a-z0-9_-]/gi, "_");
      const pdfBody = Uint8Array.from(pdfBuffer);

      return new Response(pdfBody, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeNumber}_${safeName}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unable to generate PDF.",
        },
        { status: 500 },
      );
    } finally {
      await browser?.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized or invoice not found.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
