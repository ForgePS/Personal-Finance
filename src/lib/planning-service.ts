import { db } from "@/lib/db";
import { buildMonthCalendar } from "@/lib/schedule-service";
import { formatDateKey, getMonthKey, parseMonthKey } from "@/lib/utils";

export async function getPlanningData(monthKey?: string) {
  const key = monthKey ?? getMonthKey(new Date());
  const month = parseMonthKey(key);

  const [paySchedules, scheduledExpenses, approvedAdjustments] = await Promise.all([
    db.paySchedule.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { category: true, account: true },
    }),
    db.scheduledExpense.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { category: true, account: true },
    }),
    db.scheduleDateAdjustment.findMany({
      where: { status: "APPROVED" },
    }),
  ]);

  // Reflect approved Paycheck Planner reschedules on the calendar.
  const adjustments = new Map<string, string>(
    approvedAdjustments.map((a) => [a.occurrenceKey, formatDateKey(a.adjustedDate)])
  );

  const calendar = buildMonthCalendar(paySchedules, scheduledExpenses, month, adjustments);

  return {
    monthKey: key,
    month,
    paySchedules,
    scheduledExpenses,
    calendar,
  };
}
