import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { ensureOrganizationContextForUser, getPendingInvitesForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthFinishPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const { code, next } = await searchParams;

  if (code) {
    const callbackParams = new URLSearchParams({ code });

    if (next && next.startsWith("/")) {
      callbackParams.set("next", next);
    }

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (context) {
    redirect("/dashboard");
  }

  const pendingInvites = await getPendingInvitesForCurrentUser();
  redirect(pendingInvites.length > 0 ? "/workspaces" : "/login");
}
