import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildMonthCalendar } from "@/lib/schedule-service";
import { parseMonthKey } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const month = parseMonthKey(monthKey);

  const [paySchedules, scheduledExpenses] = await Promise.all([
    db.paySchedule.findMany({
      where: { isActive: true },
      include: { category: true, account: true },
    }),
    db.scheduledExpense.findMany({
      where: { isActive: true },
      include: { category: true, account: true },
    }),
  ]);

  const calendar = buildMonthCalendar(paySchedules, scheduledExpenses, month);

  return NextResponse.json({
    ...calendar,
    month: month.toISOString(),
    occurrences: calendar.occurrences.map((o) => ({
      ...o,
      date: o.date.toISOString(),
    })),
    byDay: Object.fromEntries(
      Object.entries(calendar.byDay).map(([day, items]) => [
        day,
        items.map((o) => ({ ...o, date: o.date.toISOString() })),
      ])
    ),
  });
}
