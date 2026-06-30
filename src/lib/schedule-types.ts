export const SCHEDULE_FREQUENCIES = [
  { value: "ONCE", label: "One time", description: "One-time payment on the start date" },
  { value: "WEEKLY", label: "Weekly", description: "Every week on a set day" },
  { value: "BIWEEKLY", label: "Bi-weekly", description: "Every 2 weeks" },
  { value: "SEMIMONTHLY", label: "Semi-monthly", description: "Twice per month (e.g. 1st & 15th)" },
  { value: "MONTHLY", label: "Monthly", description: "Once per month on a set date" },
  { value: "QUARTERLY", label: "Quarterly", description: "Every 3 months" },
  { value: "YEARLY", label: "Yearly", description: "Once per year" },
  { value: "CUSTOM", label: "Custom", description: "Every N days" },
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export type ScheduleFrequency =
  | "ONCE"
  | "WEEKLY"
  | "BIWEEKLY"
  | "SEMIMONTHLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "CUSTOM";

export interface ScheduleInput {
  id: string;
  name: string;
  amount: number;
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  secondDayOfMonth?: number | null;
  customIntervalDays?: number | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  categoryId?: string | null;
  accountId?: string | null;
  color?: string;
  icon?: string;
  notes?: string | null;
  isActive?: boolean;
  priority?: number;
  category?: { name: string; color: string; icon: string } | null;
  account?: { name: string } | null;
}

export function normalizeSchedule(schedule: ScheduleInput): ScheduleInput {
  return {
    ...schedule,
    amount: Number(schedule.amount) || 0,
    dayOfWeek: schedule.dayOfWeek != null ? Number(schedule.dayOfWeek) : null,
    dayOfMonth: schedule.dayOfMonth != null ? Number(schedule.dayOfMonth) : null,
    secondDayOfMonth:
      schedule.secondDayOfMonth != null ? Number(schedule.secondDayOfMonth) : null,
    customIntervalDays:
      schedule.customIntervalDays != null ? Math.max(1, Number(schedule.customIntervalDays) || 1) : null,
    frequency: String(schedule.frequency).toUpperCase() as ScheduleFrequency,
    isActive: schedule.isActive !== false,
  };
}

export function parseScheduleInput(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ""),
    amount: Number(body.amount ?? 0),
    frequency: String(body.frequency ?? "MONTHLY") as ScheduleFrequency,
    dayOfWeek: body.dayOfWeek != null && body.dayOfWeek !== "" ? Number(body.dayOfWeek) : null,
    dayOfMonth: body.dayOfMonth != null && body.dayOfMonth !== "" ? Number(body.dayOfMonth) : null,
    secondDayOfMonth:
      body.secondDayOfMonth != null && body.secondDayOfMonth !== ""
        ? Number(body.secondDayOfMonth)
        : null,
    customIntervalDays:
      body.customIntervalDays != null && body.customIntervalDays !== ""
        ? Number(body.customIntervalDays)
        : null,
    startDate: String(body.startDate ?? new Date().toISOString().slice(0, 10)),
    endDate: body.endDate ? String(body.endDate) : null,
    categoryId: body.categoryId ? String(body.categoryId) : null,
    accountId: body.accountId ? String(body.accountId) : null,
    color: body.color ? String(body.color) : undefined,
    icon: body.icon ? String(body.icon) : undefined,
    notes: body.notes != null ? String(body.notes) : null,
    isActive: body.isActive !== false,
    priority:
      body.priority != null && body.priority !== ""
        ? Math.max(1, Math.min(100, Number(body.priority)))
        : undefined,
  };
}

export interface CalendarOccurrence {
  id: string;
  scheduleId: string;
  name: string;
  amount: number;
  date: Date;
  type: "income" | "expense";
  frequency: ScheduleFrequency;
  color: string;
  icon: string;
  categoryName?: string;
  notes?: string | null;
}
