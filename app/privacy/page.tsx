import Link from "next/link";

import { BrandMark } from "@/components/site/brand-mark";

const sections = [
  {
    title: "What we collect",
    body: "When you use DesignBayInvoice, we may process account details such as your email address, authentication identifiers, workspace membership data, business profile details, invoice content, branding assets, and issue reports that you submit through the site.",
  },
  {
    title: "How we use information",
    body: "We use this information to authenticate users, store and render invoices, manage shared workspaces, support PDF and print export, respond to issue reports, and keep the product operational and secure.",
  },
  {
    title: "Third-party processors",
    body: "The service relies on third-party infrastructure providers including Supabase for authentication, database, and storage services, Netlify for hosting and forms, and Google for sign-in. Those providers may process data as part of delivering their services.",
  },
  {
    title: "Issue reports and contact data",
    body: "If you submit an issue report, we may receive the email address you provide, the current page URL, browser details, and the message content you submit. This information is used only to investigate product issues and improve reliability.",
  },
  {
    title: "Data retention",
    body: "Workspace data remains stored until it is deleted by you or removed through normal product workflows. If a workspace is permanently deleted, associated database records are removed and branding assets are deleted as part of the application workflow.",
  },
  {
    title: "Security",
    body: "We use authentication, access controls, and database policies intended to limit access to workspace data. No system can guarantee absolute security, so you should avoid storing unnecessary sensitive information in invoices or notes.",
  },
  {
    title: "Your responsibility",
    body: "You are responsible for the accuracy of the customer, billing, and tax information you enter. If you handle regulated or especially sensitive personal data, you should evaluate whether the service is appropriate for that use before relying on it.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="font-semibold tracking-tight text-[var(--foreground)]">DesignBayInvoice</span>
          </div>
          <Link
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="card-surface px-6 py-8 sm:px-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent)]">Legal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            This page summarizes what information the product handles and how it is used in order
            to operate DesignBayInvoice.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
              href="/terms"
            >
              Terms and disclaimer
            </Link>
            <span className="text-[var(--muted)]">This privacy policy complements the terms.</span>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
