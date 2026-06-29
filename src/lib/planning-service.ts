import { db } from "@/lib/db";
import { buildMonthCalendar } from "@/lib/schedule-service";
import { getMonthKey, parseMonthKey } from "@/lib/utils";

export async function getPlanningData(monthKey?: string) {
  const key = monthKey ?? getMonthKey(new Date());
  const month = parseMonthKey(key);

  const [paySchedules, scheduledExpenses] = await Promise.all([
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
  ]);

  const calendar = buildMonthCalendar(paySchedules, scheduledExpenses, month);

  return {
    monthKey: key,
    month,
    paySchedules,
    scheduledExpenses,
    calendar,
  };
}
