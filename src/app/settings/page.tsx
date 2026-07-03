import type { Metadata } from "next";
import { withServerAuth } from "@/lib/auth-server";
import { Suspense } from "react";
import { getSettingsData } from "@/lib/settings-service";
import { SettingsPageClient } from "@/components/settings-page-client";
import { toIsoString, toIsoStringRequired } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings | Money Command",
  description: "Manage categories, known expenses, accounts, and goals",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return withServerAuth(async () => {
  const params = await searchParams;
  const data = await getSettingsData();

  const validTabs = ["categories", "known-expenses", "pay-schedules", "accounts", "goals", "household", "bank-linking"];
  const initialTab = validTabs.includes(params.tab ?? "")
    ? (params.tab as "categories" | "known-expenses" | "pay-schedules" | "accounts" | "goals" | "household" | "bank-linking")
    : "categories";

  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading settings...</div>}>
      <SettingsPageClient
        initialTab={initialTab}
        categories={data.categories}
        accounts={data.accounts}
        goals={data.goals.map((g) => ({
          ...g,
          targetDate: toIsoString(g.targetDate),
        }))}
        paySchedules={data.paySchedules.map((s) => ({
          ...s,
          startDate: toIsoStringRequired(s.startDate),
          endDate: toIsoString(s.endDate),
        }))}
        knownExpenses={data.scheduledExpenses.map((s) => ({
          ...s,
          startDate: toIsoStringRequired(s.startDate),
          endDate: toIsoString(s.endDate),
        }))}
      />
    </Suspense>
  );
  });
}
