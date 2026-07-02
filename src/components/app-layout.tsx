"use client";

import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-3 py-5 pt-[calc(3.5rem+0.75rem)] pb-24 sm:px-4 sm:py-6 lg:px-8 lg:py-8 lg:pt-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
