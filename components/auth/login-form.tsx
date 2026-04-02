"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setMessage("Magic link sent. Open the email on this device and continue back into the app.");
    setLoading(false);
  }

  return (
    <form className="card-surface rounded-[2rem] p-7 sm:p-10" onSubmit={handleSubmit}>
      <div className="mb-8">
        <p className="mb-3 inline-flex rounded-full bg-[rgba(20,87,255,0.09)] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
          Secure access
        </p>
        <h1 className="display-font text-4xl text-[var(--foreground)] sm:text-5xl">
          Sign in to DesignBayInvoice
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--muted)] sm:text-base">
          Enter your email and Supabase will send a one-time magic link. No password screens, no reset flow.
        </p>
      </div>

      <label className="field-label" htmlFor="email">
        Work Email
      </label>
      <div className="mb-4 flex items-center gap-3 rounded-[1.3rem] border border-[var(--border)] bg-white/80 px-4">
        <Mail className="h-5 w-5 text-[var(--muted)]" />
        <input
          id="email"
          className="h-14 w-full bg-transparent outline-none"
          placeholder="hello@yourbusiness.ca"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <button className="btn btn-primary w-full" disabled={loading} type="submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Send magic link
      </button>

      {message ? <p className="mt-4 text-sm font-medium text-[var(--success)]">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
    </form>
  );
}
