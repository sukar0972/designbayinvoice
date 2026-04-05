import { redirect } from "next/navigation";

import { JoinWorkspace } from "@/components/auth/join-workspace";
import { requireUser } from "@/lib/auth";
import { ensureOrganizationContextForUser, getPendingInvitesForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (context) {
    redirect("/dashboard");
  }

  const invites = await getPendingInvitesForCurrentUser();

  if (invites.length === 0) {
    redirect("/auth/finish");
  }

  return <JoinWorkspace invites={invites} userEmail={user.email ?? ""} />;
}
