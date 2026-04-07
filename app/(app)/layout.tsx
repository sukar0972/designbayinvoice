import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { getOrganizationContextForUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  const context = await getOrganizationContextForUser(supabase, user);

  return (
    <AppShell
      companyName={context?.profile.companyName}
      email={user.email}
      hasOrganization={Boolean(context)}
    >
      {children}
    </AppShell>
  );
}
