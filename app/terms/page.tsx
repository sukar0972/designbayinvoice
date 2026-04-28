import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";

const sections = [
  {
    title: "Use at your own risk",
    body: "DesignBayInvoice is provided for general invoicing and document-preparation purposes only. You are responsible for reviewing every invoice, tax amount, client detail, and exported document before sending, filing, printing, or relying on it.",
  },
  {
    title: "No legal, tax, or accounting advice",
    body: "Nothing on this site is legal, tax, accounting, or financial advice. You should rely on your own judgment and, where appropriate, your professional advisors before using any invoice, calculation, template, or workflow generated through the service.",
  },
  {
    title: "Provided as is",
    body: 'To the maximum extent permitted by law, the service is provided "as is" and "as available," without warranties of any kind, whether express, implied, or statutory. We do not guarantee uninterrupted access, error-free operation, or that the service will meet every legal, tax, operational, or record-keeping requirement that may apply to you.',
  },
  {
    title: "Limitation of liability",
    body: "To the maximum extent permitted by law, DesignBayInvoice and its maintainers will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, business, goodwill, tax position, or business opportunity arising from or related to your use of the site or any invoice, export, or content created through it.",
  },
  {
    title: "Third-party services",
    body: "The site relies on third-party infrastructure and integrations, including Supabase, Netlify, Google, and your browser environment. We are not responsible for outages, data loss, access issues, authentication failures, or service changes caused by third-party providers or your own devices, networks, or software.",
  },
  {
    title: "Your responsibility",
    body: "You are solely responsible for your records, backups, compliance obligations, tax treatment, customer communications, and for confirming that the service is appropriate for your business and jurisdiction before using it.",
  },
  {
    title: "Non-excludable rights",
    body: "Nothing in these terms excludes or limits liability, warranties, or rights that cannot legally be excluded or limited under applicable law. If any part of this page is unenforceable, the remainder will continue to apply to the fullest extent permitted by law.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="font-semibold tracking-tight text-[var(--foreground)]">DesignBayInvoice</span>
          </div>
          <Link className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]" href="/">
            Back to home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="card-surface px-6 py-8 sm:px-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent)]">Legal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Terms and Disclaimer
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            These terms are intended to make clear that use of this site and any documents generated
            through it remains your responsibility. They are not a substitute for legal review.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
              href="/privacy"
            >
              Privacy policy
            </Link>
            <span className="text-[var(--muted)]">Review how the product handles submitted data.</span>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)] sm:text-base">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
