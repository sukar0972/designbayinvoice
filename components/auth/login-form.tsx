"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError?: string | null;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.9A5.9 5.9 0 0 1 6 12c0-.7.1-1.3.4-1.9V7.4H3A10 10 0 0 0 2 12c0 1.6.4 3.2 1 4.6l3.4-2.7Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.9c1.5 0 2.9.5 4 1.5l3-3A10 10 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm({ initialError = null }: LoginFormProps) {
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/finish`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-[#fed3d1] p-4 border border-[#fec5c3]">
          <p className="text-sm font-medium text-[#8a1c08]">{error}</p>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleGoogleSignIn}
        className="btn btn-primary w-full justify-center"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleMark />}
        Continue with Google
      </button>

      <p className="text-sm text-[var(--muted)]">
        If you were invited to a workspace, sign in with the exact Google email address that received
        the invite.
      </p>
    </div>
  );
}
