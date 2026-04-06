import Link from "next/link";
import { ArrowRight, BadgeDollarSign, FileOutput, ShieldCheck, Smartphone, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getOptionalSession } from "@/lib/auth";
import { ensureOrganizationContextForUser } from "@/lib/data";

const highlights = [
  {
    title: "Canadian-ready invoicing",
    copy: "Manual GST/HST/PST-style tax rows, CAD or USD per invoice, and business profile snapshots.",
    icon: BadgeDollarSign,
  },
  {
    title: "Fast mobile workflow",
    copy: "Edit and preview side-by-side on larger screens, or switch seamlessly on smaller devices.",
    icon: Smartphone,
  },
  {
    title: "Private by default",
    copy: "Supabase auth, RLS-protected data, and reliable, lightweight hosting.",
    icon: ShieldCheck,
  },
  {
    title: "Print and PDF ready",
    copy: "Generate polished invoices directly in the browser with reliable print styling.",
    icon: FileOutput,
  },
];

export default async function HomePage() {
  const { supabase, user } = await getOptionalSession();
  let hasIncompleteSession = false;

  if (user) {
    try {
      const context = await ensureOrganizationContextForUser(supabase, user);

      if (context) {
        redirect("/dashboard");
      }

      hasIncompleteSession = true;
    } catch {
      hasIncompleteSession = true;
    }
  }

  return (
    <main className="relative min-h-screen bg-[var(--background)]">
      {/* Top Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent)] text-white">
              <span className="font-bold text-lg leading-none">D</span>
            </div>
            <span className="font-semibold text-[var(--foreground)] tracking-tight">DesignBayInvoice</span>
          </div>
          <Link className="btn btn-secondary text-sm px-4" href="/login">
            Sign in
          </Link>
        </div>
      </header>

      {hasIncompleteSession ? (
        <section className="border-b border-[#fec5c3] bg-[#fff4f3]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-medium text-[#8a1c08]">
                Your previous sign-in did not finish cleanly.
              </p>
              <p className="mt-1 text-sm text-[#8a1c08]">
                Retry Google sign-in from the login page, or sign out first to clear the current
                browser session.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="btn btn-primary" href="/login">
                Go to login
              </Link>
              <SignOutButton />
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Professional invoicing, simplified.
            </h1>
            <p className="mt-6 text-lg text-[var(--muted)] leading-8">
              DesignBayInvoice provides a clean, distraction-free environment for Canadian studios to generate, manage, and print invoices without the overhead of heavy accounting software.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="btn btn-primary px-6 py-3 text-base" href="/login">
                Get started
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
              <Link className="btn btn-secondary px-6 py-3 text-base" href="/guest">
                Try without signing in
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--accent)]" /> Free forever</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--accent)]" /> Secure login</span>
            </div>
          </div>

          {/* Simple Interface Mockup */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="card-surface p-1">
              <div className="bg-white rounded-md overflow-hidden border border-[var(--border)] shadow-sm">
                <div className="border-b border-[var(--border)] bg-[#f9fafb] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="text-xs font-medium text-[var(--muted)]">INV-2026-014</span>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-semibold">Invoice</h3>
                      <p className="text-sm text-[var(--muted)] mt-1">Northline Studio</p>
                    </div>
                    <span className="status-pill" data-status="issued">Issued</span>
                  </div>

                  <div className="space-y-4 border rounded-md border-[var(--border)] p-0">
                    <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
                      <span className="text-sm font-medium">Design sprint</span>
                      <span className="text-sm">$2,400.00</span>
                    </div>
                    <div className="flex justify-between items-center p-4 border-b border-[var(--border)] bg-[#fafbfb]">
                      <span className="text-sm font-medium">Frontend implementation</span>
                      <span className="text-sm">$3,850.00</span>
                    </div>
                    <div className="flex justify-between items-center p-4 font-semibold">
                      <span>Total Due</span>
                      <span>$7,062.50 CAD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-[var(--border)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Built for focused operations</h2>
            <p className="mt-4 text-[var(--muted)]">Everything you need to send a bill, nothing you don&apos;t.</p>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(({ title, copy, icon: Icon }) => (
              <div key={title} className="flex flex-col">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-[#f4f6f8] text-[var(--foreground)] border border-[var(--border)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[#f8faf9]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 py-6 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
              href="/terms"
            >
              Terms and disclaimer
            </Link>
            <a
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
              href="https://www.netlify.com/"
              target="_blank"
              rel="noreferrer"
            >
              This site is powered by Netlify
            </a>
          </div>
          <p className="max-w-3xl text-center text-xs leading-6 text-[var(--muted)]">
            DesignBayInvoice is provided as is. You are responsible for reviewing invoices, taxes,
            client details, exports, and compliance requirements before relying on any output.
          </p>
        </div>
      </footer>
    </main>
  );
}
