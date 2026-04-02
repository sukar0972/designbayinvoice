import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1320px] items-center px-5 py-8 sm:px-8 lg:px-10">
      <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card-surface hidden rounded-[2.4rem] p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent)]">DesignBayInvoice</p>
            <h2 className="display-font mt-6 text-5xl leading-[0.95]">
              A lean invoicing workspace for product-minded businesses.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--muted)]">
              Stay on the free Netlify tier, keep business data in Supabase, and generate invoices that still look deliberate when they leave your browser as a PDF.
            </p>
          </div>

          <div className="rounded-[1.8rem] bg-[rgba(20,87,255,0.07)] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">What happens next</p>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-[var(--foreground)]">
              <li>1. Supabase emails your sign-in link.</li>
              <li>2. The callback exchanges the session securely.</li>
              <li>3. Your business profile is created lazily on first entry.</li>
            </ol>
          </div>
        </section>

        <div className="flex flex-col justify-center">
          <LoginForm />
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Need to go back?{" "}
            <Link className="font-bold text-[var(--accent)]" href="/">
              Return to the landing page
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
