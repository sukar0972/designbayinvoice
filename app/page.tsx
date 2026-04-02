import Link from "next/link";
import { ArrowRight, BadgeDollarSign, FileOutput, ShieldCheck, Smartphone } from "lucide-react";
import { redirect } from "next/navigation";

import { getOptionalUser } from "@/lib/auth";

const highlights = [
  {
    title: "Canadian-ready invoicing",
    copy: "Manual GST/HST/PST-style tax rows, CAD or USD per invoice, and business profile snapshots on every bill.",
    icon: BadgeDollarSign,
  },
  {
    title: "Fast mobile + desktop workflow",
    copy: "Edit and preview side-by-side on larger screens, or switch between tabs on smaller devices without losing context.",
    icon: Smartphone,
  },
  {
    title: "Private by default",
    copy: "Supabase auth, RLS-protected data, and Netlify hosting with a light compute profile that fits a free-tier launch.",
    icon: ShieldCheck,
  },
  {
    title: "Print and PDF ready",
    copy: "Generate polished invoices directly in the browser and keep the export output visually aligned with the on-screen preview.",
    icon: FileOutput,
  },
];

export default async function HomePage() {
  const user = await getOptionalUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-12 flex items-center justify-between rounded-full border border-[var(--border)] bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent)]">DesignBayInvoice</p>
          </div>
          <Link className="btn btn-secondary py-3" href="/login">
            Sign in
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="max-w-3xl space-y-6">
              <p className="inline-flex rounded-full border border-[rgba(20,87,255,0.15)] bg-[rgba(20,87,255,0.08)] px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--accent)]">
                Online invoice generation for Canadian businesses
              </p>
              <h1 className="display-font text-5xl leading-[0.92] text-[var(--foreground)] sm:text-7xl">
                Send cleaner invoices without turning billing into a side project.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                DesignBayInvoice keeps invoicing focused: fast setup, strong visual output, safe Supabase auth, and a workflow that stays usable on a phone or a full desktop canvas.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-primary px-6 py-4 text-base" href="/login">
                Start with magic link
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a className="btn btn-secondary px-6 py-4 text-base" href="#features">
                See the workflow
              </a>
            </div>
          </div>

          <div className="card-surface rounded-[2.4rem] p-5 sm:p-7">
            <div className="rounded-[2rem] bg-[linear-gradient(180deg,#1b1d24_0%,#2a3148_100%)] p-5 text-white shadow-2xl">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.26em] text-white/50">Live preview</p>
                  <p className="display-font mt-2 text-3xl">Invoice No. INV-2026-014</p>
                </div>
                <span className="status-pill bg-white/12 text-white" data-status="issued">
                  Issued
                </span>
              </div>
              <div className="grid gap-4 rounded-[1.4rem] bg-white/10 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-white/55">Bill To</p>
                  <p className="mt-2 font-semibold">Northline Studio</p>
                  <p className="text-white/70">Toronto, ON</p>
                </div>
                <div>
                  <p className="text-white/55">Project</p>
                  <p className="mt-2 font-semibold">Website refresh & launch support</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 rounded-[1.4rem] bg-white p-4 text-[var(--foreground)]">
                <div className="flex items-center justify-between">
                  <span>Design sprint</span>
                  <span className="font-bold">$2,400.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Frontend implementation</span>
                  <span className="font-bold">$3,850.00</span>
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-3 text-lg font-black">
                  <span>Total Due</span>
                  <span>$7,062.50 CAD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-10" id="features">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map(({ title, copy, icon: Icon }) => (
            <article key={title} className="card-surface rounded-[2rem] p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,127,50,0.14)] text-[var(--accent-strong)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black text-[var(--foreground)]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
