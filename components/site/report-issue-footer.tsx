"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Bug, Loader2, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const ISSUE_FORM_NAME = "issue-report";

type SubmissionStatus = "idle" | "submitting" | "success";

function encodeFormData(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function ReportIssueFooter() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [issueType, setIssueType] = useState("Bug");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [botField, setBotField] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [browser, setBrowser] = useState("");
  const [signedIn, setSignedIn] = useState("unknown");
  const isPrintRoute = pathname.endsWith("/print");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPageUrl(window.location.href);
    setBrowser(window.navigator.userAgent);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    async function hydrateUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (data.user?.email) {
        setEmail(data.user.email);
        setSignedIn("yes");
        return;
      }

      setSignedIn("no");
    }

    void hydrateUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && status !== "submitting") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, status]);

  function closeModal() {
    if (status === "submitting") {
      return;
    }

    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encodeFormData({
          "form-name": ISSUE_FORM_NAME,
          email,
          issue_type: issueType,
          summary,
          details,
          page_url: pageUrl,
          browser,
          signed_in: signedIn,
          "bot-field": botField,
        }),
      });

      if (!response.ok) {
        throw new Error("Netlify did not accept the issue report.");
      }

      setStatus("success");
      setSummary("");
      setDetails("");
      setIssueType("Bug");
      setBotField("");
    } catch {
      setStatus("idle");
      setError("Could not send the issue report. Try again in a moment.");
    }
  }

  return (
    <>
      {isPrintRoute ? null : (
      <footer className="print-shell-hidden border-t border-[var(--border)] bg-[#f8faf9]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                className="text-sm font-medium text-[var(--foreground)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
                href="/terms"
              >
                Terms and disclaimer
              </Link>
              <a
                className="text-sm font-medium text-[var(--foreground)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
                href="https://www.netlify.com/"
                rel="noreferrer"
                target="_blank"
              >
                This site is powered by Netlify
              </a>
            </div>
            <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
              DesignBayInvoice is provided as is. You are responsible for reviewing invoices, taxes,
              client details, exports, and compliance requirements before relying on any output.
            </p>
          </div>

          <button
            className="inline-flex items-center gap-2 self-start rounded-md border border-transparent px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-white hover:text-[var(--foreground)] lg:self-auto"
            onClick={() => {
              setError(null);
              setStatus("idle");
              setOpen(true);
            }}
            type="button"
          >
            <Bug className="h-4 w-4" />
            Report an issue
          </button>
        </div>
      </footer>
      )}

      {open ? (
        <div
          aria-labelledby="report-issue-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,34,35,0.42)] px-4 py-6"
          role="dialog"
        >
          <button
            aria-label="Close issue report dialog"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
            type="button"
          />
          <div className="card-surface relative z-10 w-full max-w-2xl overflow-hidden border border-[rgba(32,34,35,0.08)] bg-[var(--surface)] shadow-[0_32px_70px_rgba(32,34,35,0.2)]">
            <div className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f5fbf8_100%)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                    Netlify Form
                  </p>
                  <h2
                    className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]"
                    id="report-issue-title"
                  >
                    Report an issue
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                    Send a quick note without leaving the current page. Include what happened and
                    what you expected instead.
                  </p>
                </div>
                <button
                  aria-label="Close issue report dialog"
                  className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition-colors hover:bg-[#f4f6f8] hover:text-[var(--foreground)]"
                  onClick={closeModal}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {status === "success" ? (
              <div className="space-y-4 px-6 py-6">
                <div className="rounded-2xl border border-[#b7ead7] bg-[#effaf5] p-5">
                  <p className="text-sm font-semibold text-[var(--accent-strong)]">
                    Issue report sent.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--accent-strong)]">
                    The submission is now in Netlify Forms with the page URL attached.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setStatus("idle")}
                    type="button"
                  >
                    Report another
                  </button>
                  <button className="btn btn-primary" onClick={closeModal} type="button">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-5 px-6 py-6" name={ISSUE_FORM_NAME} onSubmit={handleSubmit}>
                <input name="form-name" type="hidden" value={ISSUE_FORM_NAME} />
                <input name="bot-field" onChange={(event) => setBotField(event.target.value)} type="hidden" value={botField} />

                {error ? (
                  <div className="rounded-xl border border-[#fec5c3] bg-[#fff4f3] px-4 py-3">
                    <p className="text-sm font-medium text-[#8a1c08]">{error}</p>
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-[1.25fr_0.75fr]">
                  <label className="block">
                    <span className="field-label">Email</span>
                    <input
                      autoComplete="email"
                      className="field"
                      name="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </label>

                  <label className="block">
                    <span className="field-label">Issue type</span>
                    <select
                      className="field"
                      name="issue_type"
                      onChange={(event) => setIssueType(event.target.value)}
                      value={issueType}
                    >
                      <option value="Bug">Bug</option>
                      <option value="Confusing flow">Confusing flow</option>
                      <option value="UI problem">UI problem</option>
                      <option value="Invite problem">Invite problem</option>
                      <option value="Billing or export">Billing or export</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="field-label">Summary</span>
                  <input
                    className="field"
                    maxLength={120}
                    name="summary"
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Short title for the issue"
                    required
                    type="text"
                    value={summary}
                  />
                </label>

                <label className="block">
                  <span className="field-label">What happened?</span>
                  <textarea
                    className="field min-h-36 resize-y"
                    name="details"
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="Describe the problem, what you clicked, and what you expected to happen."
                    required
                    value={details}
                  />
                </label>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <div className="space-y-1">
                      <p className="font-medium text-[var(--foreground)]">Attached automatically</p>
                      <p className="break-all text-[var(--muted)]">{pageUrl || "Current page will be attached."}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Submitted through Netlify Forms with the current page URL and browser context.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button className="btn btn-secondary" onClick={closeModal} type="button">
                      Cancel
                    </button>
                    <button className="btn btn-primary min-w-36" disabled={status === "submitting"} type="submit">
                      {status === "submitting" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send report
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
