import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requireUser } from "@/lib/auth";
import {
  getOrganizationContextForUser,
  getDashboardSnapshot,
} from "@/lib/data";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const context = await getOrganizationContextForUser(supabase, user);

  if (!context) {
    redirect("/workspaces");
  }

  const snapshot = await getDashboardSnapshot();

  return (
    <DashboardClient
      defaultCurrency={snapshot.profile.defaultCurrency}
      invoices={snapshot.invoices}
    />
  );
}
