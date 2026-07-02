"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Mail,
  CalendarDays,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard, match: (path: string) => path === "/" },
  {
    href: "/transactions",
    label: "Activity",
    icon: ArrowLeftRight,
    match: (path: string) => path.startsWith("/transactions"),
  },
  {
    href: "/envelopes",
    label: "Envelopes",
    icon: Mail,
    match: (path: string) => path.startsWith("/envelopes"),
  },
  {
    href: "/planning",
    label: "Planning",
    icon: CalendarDays,
    match: (path: string) => path.startsWith("/planning") || path.startsWith("/paycheck-planner"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (path: string) => path.startsWith("/settings"),
  },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        {mobileNavItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[52px] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors touch-manipulation",
                isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
