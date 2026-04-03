import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { launchPdfBrowser } from "@/lib/pdf/browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<{ organization_id: string }>();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "No active organization membership." }, { status: 403 });
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, invoice_number, bill_to")
    .eq("organization_id", membership.organization_id)
    .eq("id", id)
    .maybeSingle<{
      id: string;
      invoice_number: string;
      bill_to: { name?: string };
    }>();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

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

    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    const safeNumber = (invoice.invoice_number || "invoice").replace(/[^a-z0-9_-]/gi, "_");
    const safeName = (invoice.bill_to?.name || "client").replace(/[^a-z0-9_-]/gi, "_");
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
}
