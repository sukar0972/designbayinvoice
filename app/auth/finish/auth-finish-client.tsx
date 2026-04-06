"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AuthFinishClientProps = {
  code: string;
  next?: string;
};

export function AuthFinishClient({ code, next }: AuthFinishClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message);
        window.location.replace("/login?error=auth_callback");
        return;
      }

      const target = next && next.startsWith("/") ? next : "/auth/finish";
      window.location.replace(target);
    });
  }, [code, next]);

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-6">
      <div className="card-surface w-full max-w-md p-8 text-center">
        {error ? (
          <>
            <p className="text-base font-semibold text-[#8a1c08]">Could not complete sign-in.</p>
            <p className="mt-2 text-sm text-[#8a1c08]">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
              <Loader2 className={`h-6 w-6 ${pending ? "animate-spin" : ""}`} />
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--foreground)]">
              Finishing sign-in
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Your session is being prepared.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
