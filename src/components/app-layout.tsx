"use client";

import { Sidebar } from "@/components/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 pt-16 lg:px-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
