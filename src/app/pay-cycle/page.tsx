import type { Metadata } from "next";
import { getPayCyclePlannerData } from "@/lib/pay-cycle-service";
import { PayCyclePageClient } from "@/components/pay-cycle-page-client";
import { toIsoString, toIsoStringRequired } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pay Cycle Planner | Money Command",
  description: "Plan paycheck-to-paycheck bill coverage and envelope allocations",
};

export const dynamic = "force-dynamic";

export default async function PayCyclePage({
  searchParams,
}: {
  searchParams: Promise<{ scheduleId?: string }>;
}) {
  const { scheduleId } = await searchParams;
  const data = await getPayCyclePlannerData(scheduleId);

  return (
    <PayCyclePageClient
      paySchedules={data.paySchedules.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        amount: schedule.amount,
        frequency: schedule.frequency,
        accountId: schedule.accountId,
        accountName: schedule.account?.name ?? null,
        startDate: toIsoStringRequired(schedule.startDate),
        endDate: toIsoString(schedule.endDate),
      }))}
      primaryScheduleId={data.primaryScheduleId}
      cycles={data.cycles}
      hasScheduledExpenses={data.scheduledExpenses.length > 0}
    />
  );
}
