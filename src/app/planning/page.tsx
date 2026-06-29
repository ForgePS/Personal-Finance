import type { Metadata } from "next";
import { getPlanningData } from "@/lib/planning-service";
import { PlanningPageClient } from "@/components/planning-page-client";
import { getMonthKey, toIsoString, toIsoStringRequired } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Planning | Money Command",
  description: "Plan income and scheduled expenses on a monthly calendar",
};

export const dynamic = "force-dynamic";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const monthKey = params.month ?? getMonthKey(new Date());
  const data = await getPlanningData(monthKey);

  return (
    <PlanningPageClient
      monthKey={data.monthKey}
      paySchedules={data.paySchedules.map((s) => ({
        ...s,
        startDate: toIsoStringRequired(s.startDate),
        endDate: toIsoString(s.endDate),
      }))}
      scheduledExpenses={data.scheduledExpenses.map((s) => ({
        ...s,
        startDate: toIsoStringRequired(s.startDate),
        endDate: toIsoString(s.endDate),
      }))}
    />
  );
}
