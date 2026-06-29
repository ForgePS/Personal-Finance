import type { Metadata } from "next";
import { getPlanningData } from "@/lib/planning-service";
import { PlanningPageClient } from "@/components/planning-page-client";
import { formatDateKey, getMonthKey, toIsoString, toIsoStringRequired } from "@/lib/utils";

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

  const byDay: Record<
    string,
    Array<{
      id: string;
      scheduleId: string;
      name: string;
      amount: number;
      date: string;
      type: "income" | "expense";
      color: string;
      categoryName?: string;
    }>
  > = {};

  for (const [day, items] of Object.entries(data.calendar.byDay)) {
    byDay[day] = items.map((o) => ({
      id: o.id,
      scheduleId: o.scheduleId,
      name: o.name,
      amount: o.amount,
      date: formatDateKey(o.date),
      type: o.type,
      color: o.color,
      categoryName: o.categoryName,
    }));
  }

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
      calendar={{
        totalIncome: data.calendar.totalIncome,
        totalExpenses: data.calendar.totalExpenses,
        net: data.calendar.net,
        incomeCount: data.calendar.incomeCount,
        expenseCount: data.calendar.expenseCount,
        byDay,
      }}
    />
  );
}
