import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();

  return <AppShell email={user.email}>{children}</AppShell>;
}
