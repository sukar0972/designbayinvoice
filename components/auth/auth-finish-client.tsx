"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function AuthFinishClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing Google sign-in...");

  useEffect(() => {
    let active = true;

    async function completeSignIn() {
      const supabase = createClient();
      const finishWithSession = async () => {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          router.replace("/login?error=auth_callback");
          return true;
        }

        if (!session) {
          return false;
        }

        if (!active) {
          return true;
        }

        setMessage("Redirecting to your workspace...");
        router.replace("/dashboard");
        router.refresh();
        return true;
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
        if (!session || !active) {
          return;
        }

        setMessage("Redirecting to your workspace...");
        router.replace("/dashboard");
        router.refresh();
        },
      );

      if (await finishWithSession()) {
        subscription.unsubscribe();
        return;
      }

      // Allow the browser client to auto-complete the PKCE exchange from the URL.
      window.setTimeout(async () => {
        const handled = await finishWithSession();
        if (!handled && active) {
          router.replace("/login?error=auth_callback");
        }
        subscription.unsubscribe();
      }, 500);
    }

    completeSignIn();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-16">
      <div className="card-surface w-full max-w-md px-6 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f3ef] text-[var(--accent)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Finishing sign-in
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
      </div>
    </main>
  );
}
