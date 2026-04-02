import Link from "next/link";
import { FileText, LayoutDashboard, Settings2 } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";

type AppShellProps = {
  email?: string;
  children: React.ReactNode;
};

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/invoices/new",
    label: "New Invoice",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
  },
];

export function AppShell({ email, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:px-8 lg:py-6">
        <aside className="card-surface print-shell-hidden flex flex-col justify-between rounded-[2rem] p-5 lg:min-h-[calc(100vh-3rem)] lg:w-[280px]">
          <div>
            <Link className="mb-8 block" href="/dashboard">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent)]">
                DesignBayInvoice
              </p>
              <p className="display-font mt-3 text-3xl leading-none">Billing built for Canadian studios.</p>
            </Link>

            <nav className="space-y-2">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  className="flex items-center justify-between rounded-[1.4rem] border border-transparent bg-white/60 px-4 py-3 font-semibold transition hover:border-[var(--border)] hover:bg-white"
                  href={href}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 space-y-3">
            <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/75 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Signed in as</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{email ?? "Unknown user"}</p>
            </div>
            <SignOutButton />
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
