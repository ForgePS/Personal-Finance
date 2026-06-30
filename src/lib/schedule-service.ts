import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  getDaysInMonth,
} from "date-fns";
import type { CalendarOccurrence, ScheduleFrequency, ScheduleInput } from "./schedule-types";
import { normalizeSchedule } from "./schedule-types";
import { formatDateKey, parseLocalDate } from "./utils";

function toDate(d: Date | string): Date {
  return parseLocalDate(d);
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
  const stepDays = Math.max(1, intervalWeeks) * 7;

  let cursor = start;
  let guard = 0;
  while (cursor.getDay() !== dayOfWeek && guard++ < 7) {
    cursor = addDays(cursor, 1);
  }

  guard = 0;
  while (isBefore(cursor, monthStart) && guard++ < 520) {
    cursor = addDays(cursor, stepDays);
  }

  guard = 0;
  while (!isAfter(cursor, monthEnd) && guard++ < 40) {
    if (!isBefore(cursor, monthStart) && isInRange(cursor, start, schedule.endDate)) {
      occurrences.push(makeOccurrence(schedule, cursor, type));
    }
    cursor = addDays(cursor, stepDays);
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
  const interval = Math.max(1, schedule.customIntervalDays ?? 30);

  let cursor = start;
  let guard = 0;
  while (isBefore(cursor, monthStart) && guard++ < 5000) {
    cursor = addDays(cursor, interval);
  }

  guard = 0;
  while (!isAfter(cursor, monthEnd) && guard++ < 40) {
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
    id: `${schedule.id}-${formatDateKey(date)}`,
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
  const normalized = normalizeSchedule(schedule);
  if (normalized.isActive === false) return [];

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  switch (normalized.frequency as ScheduleFrequency) {
    case "ONCE": {
      const start = toDate(normalized.startDate);
      if (
        !isBefore(start, monthStart) &&
        !isAfter(start, monthEnd) &&
        isInRange(start, start, normalized.endDate)
      ) {
        return [makeOccurrence(normalized, start, type)];
      }
      return [];
    }
    case "WEEKLY":
      return getWeeklyOccurrences(normalized, monthStart, monthEnd, 1, type);
    case "BIWEEKLY":
      return getWeeklyOccurrences(normalized, monthStart, monthEnd, 2, type);
    case "SEMIMONTHLY":
      return getSemiMonthlyOccurrences(normalized, monthStart, monthEnd, type);
    case "MONTHLY":
      return getMonthlyOccurrences(normalized, monthStart, monthEnd, type, 1);
    case "QUARTERLY":
      return getMonthlyOccurrences(normalized, monthStart, monthEnd, type, 3);
    case "YEARLY": {
      const start = toDate(normalized.startDate);
      const day = normalized.dayOfMonth ?? start.getDate();
      const occDate = clampDayOfMonth(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (
        monthStart.getMonth() === start.getMonth() &&
        !isBefore(occDate, monthStart) &&
        !isAfter(occDate, monthEnd) &&
        isInRange(occDate, start, normalized.endDate)
      ) {
        return [makeOccurrence(normalized, occDate, type)];
      }
      return [];
    }
    case "CUSTOM":
      return getCustomOccurrences(normalized, monthStart, monthEnd, type);
    default:
      return [];
  }
}

export function getScheduleOccurrencesInRange(
  schedule: ScheduleInput,
  rangeStart: Date,
  rangeEnd: Date,
  type: "income" | "expense"
): CalendarOccurrence[] {
  const normalized = normalizeSchedule(schedule);
  if (normalized.isActive === false) return [];

  const months: Date[] = [];
  let cursor = startOfMonth(rangeStart);
  const lastMonth = endOfMonth(rangeEnd);

  while (!isAfter(cursor, lastMonth)) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  const seen = new Set<string>();
  const occurrences: CalendarOccurrence[] = [];

  for (const month of months) {
    for (const occ of getScheduleOccurrencesInMonth(normalized, month, type)) {
      if (isBefore(occ.date, rangeStart) || isAfter(occ.date, rangeEnd)) continue;
      if (seen.has(occ.id)) continue;
      seen.add(occ.id);
      occurrences.push(occ);
    }
  }

  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function buildMonthCalendar(
  paySchedules: ScheduleInput[],
  scheduledExpenses: ScheduleInput[],
  month: Date
) {
  const activePay = paySchedules.map(normalizeSchedule).filter((s) => s.isActive !== false);
  const activeExpenses = scheduledExpenses.map(normalizeSchedule).filter((s) => s.isActive !== false);

  const incomeOccurrences = activePay.flatMap((s) =>
    getScheduleOccurrencesInMonth(s, month, "income")
  );
  const expenseOccurrences = activeExpenses.flatMap((s) =>
    getScheduleOccurrencesInMonth(s, month, "expense")
  );

  const all = [...incomeOccurrences, ...expenseOccurrences].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const byDay: Record<string, CalendarOccurrence[]> = {};
  for (const occ of all) {
    const key = formatDateKey(occ.date);
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
    case "ONCE":
      return "One time";
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
