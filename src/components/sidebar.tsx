"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PieChart,
  Target,
  TrendingUp,
  CalendarDays,
  Settings,
  Menu,
  X,
  Command,
  Mail,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { signOutUser } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/envelopes", label: "Envelopes", icon: Mail },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/paycheck-planner", label: "Paycheck Planner", icon: Wallet },
  { href: "/advisor", label: "Advisor", icon: Sparkles },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/cash-flow", label: "Cash Flow", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTenantName(data.tenantName ?? null);
          setUserEmail(data.email ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch {
      await fetch("/api/auth/logout", { method: "POST" });
    }
    window.location.href = "/login";
  };

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
          <Command className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Money Command</h1>
          <p className="text-xs text-indigo-300">Personal Finance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-indigo-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-3">
        {(tenantName || userEmail) && (
          <div className="rounded-xl bg-white/10 p-3">
            {tenantName && (
              <p className="text-xs font-semibold text-white truncate">{tenantName}</p>
            )}
            {userEmail && (
              <p className="mt-0.5 text-xs text-indigo-200/80 truncate">{userEmail}</p>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-white/15"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )}
        <div className="rounded-xl bg-white/10 p-3">
          <p className="text-xs font-medium text-indigo-200">Pro Tip</p>
          <p className="mt-1 text-xs text-indigo-100/80">
            Use envelopes to separate your money into expense categories each month.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-indigo-600 p-2 text-white shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-indigo-300 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <NavContent />
      </aside>
    </>
  );
}
