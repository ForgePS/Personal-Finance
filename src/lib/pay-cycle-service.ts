import {
  addDays,
  addMonths,
  isBefore,
  startOfDay,
  subDays,
} from "date-fns";
import { db } from "@/lib/db";
import { getEnvelopeData, fundEnvelope, fundPoolFromAccounts } from "@/lib/envelope-service";
import type { EnvelopeWithStats } from "@/lib/envelope-service";
import { getScheduleOccurrencesInRange } from "@/lib/schedule-service";
import type { ScheduleFrequency, ScheduleInput } from "@/lib/schedule-types";
import { formatDateKey, getMonthKey, parseMonthKey } from "@/lib/utils";

export interface PayCycleBill {
  id: string;
  name: string;
  amount: number;
  date: string;
  categoryName?: string;
}

export interface PayCycleAllocationSuggestion {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  budgetAmount: number | null;
  currentAllocated: number;
  suggestedAmount: number;
}

export interface PayCycle {
  id: string;
  payScheduleId: string;
  payScheduleName: string;
  payDate: string;
  cycleEnd: string;
  monthKey: string;
  paycheckAmount: number;
  additionalIncome: number;
  totalIncome: number;
  bills: PayCycleBill[];
  totalBills: number;
  remaining: number;
  allocations: PayCycleAllocationSuggestion[];
  isShortfall: boolean;
}

function paysPerMonth(frequency: ScheduleFrequency, customIntervalDays?: number | null) {
  switch (frequency) {
    case "WEEKLY":
      return 52 / 12;
    case "BIWEEKLY":
      return 26 / 12;
    case "SEMIMONTHLY":
      return 2;
    case "MONTHLY":
      return 1;
    case "QUARTERLY":
      return 1 / 3;
    case "YEARLY":
      return 1 / 12;
    case "CUSTOM":
      return 30 / Math.max(1, customIntervalDays ?? 30);
    default:
      return 1;
  }
}

function buildAllocationSuggestions(
  envelopes: EnvelopeWithStats[],
  frequency: ScheduleFrequency,
  customIntervalDays: number | null | undefined,
  remaining: number
): PayCycleAllocationSuggestion[] {
  if (remaining <= 0 || envelopes.length === 0) return [];

  const perPay = paysPerMonth(frequency, customIntervalDays);
  const rawSuggestions = envelopes.map((envelope) => {
    const budgetGap =
      envelope.budgetAmount != null
        ? Math.max(0, envelope.budgetAmount - envelope.allocated)
        : 0;
    const perPayTarget =
      envelope.budgetAmount != null ? envelope.budgetAmount / perPay : 0;
    const suggestedAmount = budgetGap > 0 ? Math.min(budgetGap, perPayTarget) : perPayTarget;

    return {
      categoryId: envelope.categoryId,
      categoryName: envelope.category.name,
      color: envelope.category.color,
      icon: envelope.category.icon,
      budgetAmount: envelope.budgetAmount,
      currentAllocated: envelope.allocated,
      suggestedAmount: Math.round(suggestedAmount * 100) / 100,
    };
  });

  const withTargets = rawSuggestions.filter((s) => s.suggestedAmount > 0);
  const source = withTargets.length > 0 ? withTargets : rawSuggestions;
  const totalSuggested = source.reduce((sum, item) => sum + item.suggestedAmount, 0);

  if (totalSuggested <= remaining) {
    return source;
  }

  const scale = remaining / totalSuggested;
  return source.map((item) => ({
    ...item,
    suggestedAmount: Math.round(item.suggestedAmount * scale * 100) / 100,
  }));
}

export function buildPayCycles(
  primarySchedule: ScheduleInput,
  allPaySchedules: ScheduleInput[],
  scheduledExpenses: ScheduleInput[],
  envelopesByMonth: Map<string, EnvelopeWithStats[]>,
  options: { count?: number; fromDate?: Date } = {}
): PayCycle[] {
  const count = options.count ?? 6;
  const fromDate = startOfDay(options.fromDate ?? new Date());
  const rangeEnd = addMonths(fromDate, 4);

  const paychecks = getScheduleOccurrencesInRange(
    primarySchedule,
    fromDate,
    rangeEnd,
    "income"
  ).filter((occ) => !isBefore(startOfDay(occ.date), fromDate));

  const expenseOccurrences = scheduledExpenses.flatMap((schedule) =>
    getScheduleOccurrencesInRange(schedule, fromDate, rangeEnd, "expense")
  );

  const otherIncomeSchedules = allPaySchedules.filter(
    (schedule) => schedule.id !== primarySchedule.id && schedule.isActive !== false
  );

  const cycles: PayCycle[] = [];

  for (let i = 0; i < Math.min(count, paychecks.length); i++) {
    const paycheck = paychecks[i];
    const nextPaycheck = paychecks[i + 1];
    const cycleStart = startOfDay(paycheck.date);
    const cycleEnd = nextPaycheck
      ? subDays(startOfDay(nextPaycheck.date), 1)
      : addDays(cycleStart, 13);
    const monthKey = getMonthKey(paycheck.date);

    const bills = expenseOccurrences
      .filter((bill) => {
        const billDate = startOfDay(bill.date);
        return !isBefore(billDate, cycleStart) && !isAfterDay(billDate, cycleEnd);
      })
      .map((bill) => ({
        id: bill.id,
        name: bill.name,
        amount: bill.amount,
        date: formatDateKey(bill.date),
        categoryName: bill.categoryName,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const additionalIncome = otherIncomeSchedules
      .flatMap((schedule) =>
        getScheduleOccurrencesInRange(schedule, cycleStart, cycleEnd, "income")
      )
      .filter((occ) => occ.scheduleId !== paycheck.scheduleId)
      .reduce((sum, occ) => sum + occ.amount, 0);

    const paycheckAmount = paycheck.amount;
    const totalIncome = paycheckAmount + additionalIncome;
    const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const remaining = totalIncome - totalBills;

    const envelopeData = envelopesByMonth.get(monthKey);
    const allocations = envelopeData
      ? buildAllocationSuggestions(
          envelopeData,
          primarySchedule.frequency,
          primarySchedule.customIntervalDays,
          Math.max(0, remaining)
        )
      : [];

    cycles.push({
      id: `${primarySchedule.id}-${formatDateKey(paycheck.date)}`,
      payScheduleId: primarySchedule.id,
      payScheduleName: primarySchedule.name,
      payDate: formatDateKey(paycheck.date),
      cycleEnd: formatDateKey(cycleEnd),
      monthKey,
      paycheckAmount,
      additionalIncome,
      totalIncome,
      bills,
      totalBills,
      remaining,
      allocations,
      isShortfall: remaining < 0,
    });
  }

  return cycles;
}

function isAfterDay(date: Date, compare: Date) {
  return startOfDay(date).getTime() > startOfDay(compare).getTime();
}

export async function getPayCyclePlannerData(scheduleId?: string) {
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

  const primarySchedule =
    paySchedules.find((schedule) => schedule.id === scheduleId) ?? paySchedules[0] ?? null;

  if (!primarySchedule) {
    return {
      paySchedules,
      scheduledExpenses,
      primaryScheduleId: null,
      cycles: [] as PayCycle[],
    };
  }

  const previewEnd = addMonths(new Date(), 4);
  const monthKeys = new Set<string>();
  let cursor = startOfDay(new Date());
  while (!isBefore(previewEnd, cursor)) {
    monthKeys.add(getMonthKey(cursor));
    cursor = addMonths(cursor, 1);
  }

  const envelopesByMonth = new Map<string, EnvelopeWithStats[]>();
  for (const monthKey of monthKeys) {
    const envelopeData = await getEnvelopeData(parseMonthKey(monthKey));
    envelopesByMonth.set(monthKey, envelopeData.envelopes);
  }

  const cycles = buildPayCycles(
    primarySchedule,
    paySchedules,
    scheduledExpenses,
    envelopesByMonth,
    { count: 6 }
  );

  return {
    paySchedules,
    scheduledExpenses,
    primaryScheduleId: primarySchedule.id,
    cycles,
  };
}

export async function applyPayCyclePlan(input: {
  monthKey: string;
  accountId: string;
  poolAmount: number;
  allocations: Array<{ categoryId: string; amount: number }>;
  note?: string;
}) {
  const month = parseMonthKey(input.monthKey);
  const validAllocations = input.allocations.filter((item) => item.amount > 0);
  const allocationTotal = validAllocations.reduce((sum, item) => sum + item.amount, 0);

  if (input.poolAmount <= 0 && allocationTotal <= 0) {
    throw new Error("Add pool funding or envelope allocations");
  }

  if (input.poolAmount > 0) {
    await fundPoolFromAccounts(
      month,
      [{ accountId: input.accountId, amount: input.poolAmount }],
      input.note ?? "Pay cycle planner funding"
    );
  }

  for (const allocation of validAllocations) {
    await fundEnvelope(allocation.categoryId, month, allocation.amount);
  }

  return getEnvelopeData(month);
}
