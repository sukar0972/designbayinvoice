"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Settings2, Menu, X } from "lucide-react";
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
  const [mobileMenuPathname, setMobileMenuPathname] = useState<string | null>(null);
  const pathname = usePathname();
  const isMobileMenuOpen = mobileMenuPathname === pathname;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="print-shell-hidden md:hidden flex items-center justify-between p-4 bg-white border-b border-[var(--border)] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent)] text-white shadow-sm">
            <span className="font-bold text-lg leading-none">D</span>
          </div>
          <span className="font-semibold text-[var(--foreground)] tracking-tight">DesignBayInvoice</span>
        </div>
        <button
          onClick={() =>
            setMobileMenuPathname((current) => (current === pathname ? null : pathname))
          }
          className="p-2 -mr-2 rounded-md text-[var(--muted)] hover:bg-[#f4f6f8] transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`print-shell-hidden md:hidden fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuPathname(null)}
        aria-hidden="true"
      />

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`print-shell-hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-[var(--border)] shadow-[1px_0_0_0_rgba(0,0,0,0.05)] transform transition-transform duration-200 ease-in-out flex flex-col md:relative md:w-[240px] md:translate-x-0 md:min-h-screen md:sticky md:top-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-lg" : "-translate-x-full"
        }`}
      >
        <div className="p-4 hidden md:flex items-center gap-3 border-b border-[var(--border)] md:border-b-0 h-16 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent)] text-white shadow-sm">
            <span className="font-bold text-lg leading-none">D</span>
          </div>
          <span className="font-semibold text-[var(--foreground)] tracking-tight">DesignBayInvoice</span>
        </div>

        <nav className="p-3 flex-1 space-y-1 overflow-y-auto mt-4 md:mt-0">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuPathname(null)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-[#f4f6f8] text-[var(--foreground)]"
                    : "text-[var(--foreground)] hover:bg-[#f4f6f8]"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-[#f4f6f8] flex items-center justify-center border border-[var(--border)] shrink-0">
              <span className="text-xs font-medium text-[var(--muted)]">
                {email?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-[var(--foreground)] truncate">{email || "Admin"}</span>
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
