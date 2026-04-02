import Link from "next/link";
import { FileText, LayoutDashboard, Settings2, LogOut } from "lucide-react";
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
    label: "New invoice",
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
    <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row">
      <aside className="print-shell-hidden w-full md:w-[240px] flex-shrink-0 border-r border-[var(--border)] bg-white flex flex-col z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] md:min-h-screen sticky top-0">
        <div className="p-4 flex items-center gap-3 border-b border-[var(--border)] md:border-b-0 h-16">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent)] text-white shadow-sm">
            <span className="font-bold text-lg leading-none">D</span>
          </div>
          <span className="font-semibold text-[var(--foreground)] tracking-tight">DesignBayInvoice</span>
        </div>

        <nav className="p-3 flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--foreground)] rounded-md hover:bg-[#f4f6f8] transition-colors"
            >
              <Icon className="h-5 w-5 text-[var(--muted)]" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-[#f4f6f8] flex items-center justify-center border border-[var(--border)]">
              <span className="text-xs font-medium text-[var(--muted)]">{email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-[var(--foreground)] truncate">{email}</span>
              <span className="text-[10px] text-[var(--muted)]">Admin</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 mx-auto max-w-6xl">{children}</main>
    </div>
  );
}