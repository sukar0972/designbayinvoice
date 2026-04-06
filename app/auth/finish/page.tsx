import { redirect } from "next/navigation";

import { AuthFinishClient } from "@/app/auth/finish/auth-finish-client";
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
    return <AuthFinishClient code={code} next={next} />;
  }

  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (context) {
    redirect("/dashboard");
  }

  const pendingInvites = await getPendingInvitesForCurrentUser();
  redirect(pendingInvites.length > 0 ? "/join" : "/login");
}
