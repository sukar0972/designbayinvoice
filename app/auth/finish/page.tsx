import { redirect } from "next/navigation";

import { AuthFinishClient } from "@/components/auth/auth-finish-client";
import { requireUser } from "@/lib/auth";
import { ensureOrganizationContextForUser, getPendingInvitesForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthFinishPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (code) {
    return <AuthFinishClient code={code} />;
  }

  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (context) {
    redirect("/dashboard");
  }

  const pendingInvites = await getPendingInvitesForCurrentUser();
  redirect(pendingInvites.length > 0 ? "/join" : "/login");
}
