"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

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

    setMessage("Magic link sent. Check your email to sign in.");
    setLoading(false);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {message && (
        <div className="rounded-md bg-[#e0f2fe] p-4 border border-[#bae6fd]">
          <p className="text-sm font-medium text-[#006eb3]">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="rounded-md bg-[#fed3d1] p-4 border border-[#fec5c3]">
          <p className="text-sm font-medium text-[#8a1c08]">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full justify-center"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue with Email
        </button>
      </div>
    </form>
  );
}