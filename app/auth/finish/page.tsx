import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureOrganizationContextForUser, getPendingInvitesForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthFinishPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect("/login?error=auth_callback");
    }
  }

  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (context) {
    redirect("/dashboard");
  }

  const pendingInvites = await getPendingInvitesForCurrentUser();
  redirect(pendingInvites.length > 0 ? "/join" : "/login");
}
