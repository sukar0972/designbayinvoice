import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { requireOrganizationContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  const { profile } = await requireOrganizationContext();

  return <AppShell companyName={profile.companyName} email={user.email}>{children}</AppShell>;
}
