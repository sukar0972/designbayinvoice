import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getDashboardSnapshot } from "@/lib/invoices/data";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <DashboardClient
      defaultCurrency={snapshot.profile.defaultCurrency}
      invoices={snapshot.invoices}
    />
  );
}
