import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { ensureOrganizationContextForUser, getPendingInvitesForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthFinishPage() {
  const { supabase, user } = await requireUser();
  const context = await ensureOrganizationContextForUser(supabase, user);

  if (context) {
    redirect("/dashboard");
  }

  const pendingInvites = await getPendingInvitesForCurrentUser();
  redirect(pendingInvites.length > 0 ? "/join" : "/login");
}
