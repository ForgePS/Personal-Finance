import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfDay,
  getDaysInMonth,
} from "date-fns";
import type { CalendarOccurrence, ScheduleFrequency, ScheduleInput } from "./schedule-types";

function toDate(d: Date | string): Date {
  return startOfDay(new Date(d));
}

function isInRange(date: Date, start: Date, end?: Date | string | null): boolean {
  if (isBefore(date, start)) return false;
  if (end && isAfter(date, toDate(end))) return false;
  return true;
}

function clampDayOfMonth(year: number, month: number, day: number): Date {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  return new Date(year, month, Math.min(day, daysInMonth));
}

function getWeeklyOccurrences(
  schedule: ScheduleInput,
  monthStart: Date,
  monthEnd: Date,
  intervalWeeks: number,
  type: "income" | "expense"
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];
  const start = toDate(schedule.startDate);
  const dayOfWeek = schedule.dayOfWeek ?? 5; // default Friday

  let cursor = start;
  while (cursor.getDay() !== dayOfWeek) {
    cursor = addDays(cursor, 1);
  }

  while (isBefore(cursor, monthStart)) {
    cursor = addDays(cursor, intervalWeeks * 7);
  }

  while (!isAfter(cursor, monthEnd)) {
    if (!isBefore(cursor, monthStart) && isInRange(cursor, start, schedule.endDate)) {
      occurrences.push(makeOccurrence(schedule, cursor, type));
    }
    cursor = addDays(cursor, intervalWeeks * 7);
  }

  return occurrences;
}

function getMonthlyOccurrences(
  schedule: ScheduleInput,
  monthStart: Date,
  monthEnd: Date,
  type: "income" | "expense",
  monthInterval = 1
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];
  const start = toDate(schedule.startDate);
  const day = schedule.dayOfMonth ?? start.getDate();

  let cursor = startOfMonth(monthStart);
  const rangeEnd = endOfMonth(monthEnd);

  while (!isAfter(cursor, rangeEnd)) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const occDate = clampDayOfMonth(year, month, day);

    if (
      !isBefore(occDate, monthStart) &&
      !isAfter(occDate, monthEnd) &&
      isInRange(occDate, start, schedule.endDate) &&
      !isBefore(occDate, start)
    ) {
      occurrences.push(makeOccurrence(schedule, occDate, type));
    }

    cursor = addMonths(cursor, monthInterval);
  }

  return occurrences;
}

function getSemiMonthlyOccurrences(
  schedule: ScheduleInput,
  monthStart: Date,
  monthEnd: Date,
  type: "income" | "expense"
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];
  const start = toDate(schedule.startDate);
  const day1 = schedule.dayOfMonth ?? 1;
  const day2 = schedule.secondDayOfMonth ?? 15;

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();

  for (const day of [day1, day2]) {
    const occDate = clampDayOfMonth(year, month, day);
    if (
      !isBefore(occDate, monthStart) &&
      !isAfter(occDate, monthEnd) &&
      isInRange(occDate, start, schedule.endDate) &&
      !isBefore(occDate, start)
    ) {
      occurrences.push(makeOccurrence(schedule, occDate, type));
    }
  }

  return occurrences;
}

function getCustomOccurrences(
  schedule: ScheduleInput,
  monthStart: Date,
  monthEnd: Date,
  type: "income" | "expense"
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];
  const start = toDate(schedule.startDate);
  const interval = schedule.customIntervalDays ?? 30;

  let cursor = start;
  while (isBefore(cursor, monthStart)) {
    cursor = addDays(cursor, interval);
  }

  while (!isAfter(cursor, monthEnd)) {
    if (isInRange(cursor, start, schedule.endDate)) {
      occurrences.push(makeOccurrence(schedule, cursor, type));
    }
    cursor = addDays(cursor, interval);
  }

  return occurrences;
}

function makeOccurrence(
  schedule: ScheduleInput,
  date: Date,
  type: "income" | "expense"
): CalendarOccurrence {
  return {
    id: `${schedule.id}-${date.toISOString().slice(0, 10)}`,
    scheduleId: schedule.id,
    name: schedule.name,
    amount: schedule.amount,
    date,
    type,
    frequency: schedule.frequency,
    color: schedule.color ?? (type === "income" ? "#22c55e" : "#f97316"),
    icon: schedule.icon ?? (type === "income" ? "briefcase" : "calendar"),
    categoryName: schedule.category?.name,
    notes: schedule.notes,
  };
}

export function getScheduleOccurrencesInMonth(
  schedule: ScheduleInput,
  month: Date,
  type: "income" | "expense"
): CalendarOccurrence[] {
  if (schedule.isActive === false) return [];

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  switch (schedule.frequency as ScheduleFrequency) {
    case "WEEKLY":
      return getWeeklyOccurrences(schedule, monthStart, monthEnd, 1, type);
    case "BIWEEKLY":
      return getWeeklyOccurrences(schedule, monthStart, monthEnd, 2, type);
    case "SEMIMONTHLY":
      return getSemiMonthlyOccurrences(schedule, monthStart, monthEnd, type);
    case "MONTHLY":
      return getMonthlyOccurrences(schedule, monthStart, monthEnd, type, 1);
    case "QUARTERLY":
      return getMonthlyOccurrences(schedule, monthStart, monthEnd, type, 3);
    case "YEARLY": {
      const start = toDate(schedule.startDate);
      const day = schedule.dayOfMonth ?? start.getDate();
      const occDate = clampDayOfMonth(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (
        monthStart.getMonth() === start.getMonth() &&
        !isBefore(occDate, monthStart) &&
        !isAfter(occDate, monthEnd) &&
        isInRange(occDate, start, schedule.endDate)
      ) {
        return [makeOccurrence(schedule, occDate, type)];
      }
      return [];
    }
    case "CUSTOM":
      return getCustomOccurrences(schedule, monthStart, monthEnd, type);
    default:
      return [];
  }
}

export function buildMonthCalendar(
  paySchedules: ScheduleInput[],
  scheduledExpenses: ScheduleInput[],
  month: Date
) {
  const incomeOccurrences = paySchedules.flatMap((s) =>
    getScheduleOccurrencesInMonth(s, month, "income")
  );
  const expenseOccurrences = scheduledExpenses.flatMap((s) =>
    getScheduleOccurrencesInMonth(s, month, "expense")
  );

  const all = [...incomeOccurrences, ...expenseOccurrences].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const byDay: Record<string, CalendarOccurrence[]> = {};
  for (const occ of all) {
    const key = occ.date.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(occ);
  }

  const totalIncome = incomeOccurrences.reduce((s, o) => s + o.amount, 0);
  const totalExpenses = expenseOccurrences.reduce((s, o) => s + o.amount, 0);

  return {
    month,
    occurrences: all,
    byDay,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    incomeCount: incomeOccurrences.length,
    expenseCount: expenseOccurrences.length,
  };
}

export function formatFrequencyLabel(schedule: ScheduleInput): string {
  switch (schedule.frequency) {
    case "WEEKLY": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Weekly on ${days[schedule.dayOfWeek ?? 5]}`;
    }
    case "BIWEEKLY": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Every 2 weeks on ${days[schedule.dayOfWeek ?? 5]}`;
    }
    case "SEMIMONTHLY":
      return `${schedule.dayOfMonth ?? 1}th & ${schedule.secondDayOfMonth ?? 15}th`;
    case "MONTHLY":
      return `Monthly on day ${schedule.dayOfMonth ?? 1}`;
    case "QUARTERLY":
      return `Quarterly on day ${schedule.dayOfMonth ?? 1}`;
    case "YEARLY":
      return `Yearly on day ${schedule.dayOfMonth ?? 1}`;
    case "CUSTOM":
      return `Every ${schedule.customIntervalDays ?? 30} days`;
    default:
      return schedule.frequency;
  }
}

export function datesEqual(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
