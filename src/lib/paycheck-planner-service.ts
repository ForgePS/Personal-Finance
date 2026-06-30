import { addDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { getScheduleOccurrencesInRange } from "@/lib/schedule-service";
import type { ScheduleInput } from "@/lib/schedule-types";
import { formatDateKey } from "@/lib/utils";
import {
  PLANNER_HORIZON_DAYS,
  type PaycheckPlannerData,
  type PlannerAdjustment,
  type PlannerEvent,
  type PlannerEventStatus,
} from "@/lib/paycheck-planner-types";

export { PLANNER_HORIZON_DAYS } from "@/lib/paycheck-planner-types";
export type {
  PaycheckPlannerData,
  PlannerAdjustment,
  PlannerEvent,
  PlannerEventStatus,
  PaycheckPlannerSummary,
} from "@/lib/paycheck-planner-types";

function matchesAccount(scheduleAccountId: string | null | undefined, accountId: string | null) {
  if (!accountId) return true;
  if (!scheduleAccountId) return true;
  return scheduleAccountId === accountId;
}

function pickDefaultAccount(
  accounts: Array<{ id: string; name: string; type: string; balance: number }>
) {
  const checking = accounts.find((a) => a.type === "CHECKING");
  return checking ?? accounts[0] ?? null;
}

export async function getPaycheckPlannerData(accountId?: string | null): Promise<PaycheckPlannerData> {
  const today = startOfDay(new Date());
  const rangeEnd = addDays(today, PLANNER_HORIZON_DAYS);

  const [accounts, paySchedules, scheduledExpenses, adjustments] = await Promise.all([
    db.account.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
    }),
    db.paySchedule.findMany({
      where: { isActive: true },
      include: { category: true, account: true },
    }),
    db.scheduledExpense.findMany({
      where: { isActive: true },
      include: { category: true, account: true },
    }),
    db.scheduleDateAdjustment.findMany({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const selectedAccount = accountId
    ? accounts.find((a) => a.id === accountId) ?? null
    : pickDefaultAccount(accounts);

  const startingBalance = selectedAccount?.balance ?? 0;
  const selectedAccountId = selectedAccount?.id ?? null;

  const adjustmentByKey = new Map(
    adjustments.map((a) => [
      a.occurrenceKey,
      {
        id: a.id,
        occurrenceKey: a.occurrenceKey,
        originalDate: formatDateKey(a.originalDate),
        adjustedDate: formatDateKey(a.adjustedDate),
        status: a.status as PlannerAdjustment["status"],
        notes: a.notes,
      },
    ])
  );

  const priorityByScheduleId = new Map(
    scheduledExpenses.map((e) => [e.id, (e as { priority?: number }).priority ?? 50])
  );

  type RawEvent = {
    occurrenceKey: string;
    scheduleId: string;
    name: string;
    amount: number;
    type: "income" | "expense";
    originalDate: string;
    effectiveDate: string;
    priority: number;
    color: string;
    categoryName?: string;
    adjustment?: PlannerAdjustment;
  };

  const rawEvents: RawEvent[] = [];

  for (const schedule of paySchedules as ScheduleInput[]) {
    if (!matchesAccount(schedule.accountId, selectedAccountId)) continue;
    for (const occ of getScheduleOccurrencesInRange(schedule, today, rangeEnd, "income")) {
      const occurrenceKey = occ.id;
      const originalDate = formatDateKey(occ.date);
      const adjustment = adjustmentByKey.get(occurrenceKey);
      const effectiveDate =
        adjustment?.status === "APPROVED" ? adjustment.adjustedDate : originalDate;

      rawEvents.push({
        occurrenceKey,
        scheduleId: occ.scheduleId,
        name: occ.name,
        amount: occ.amount,
        type: "income",
        originalDate,
        effectiveDate,
        priority: 0,
        color: occ.color,
        categoryName: occ.categoryName,
        adjustment,
      });
    }
  }

  for (const schedule of scheduledExpenses as ScheduleInput[]) {
    if (!matchesAccount(schedule.accountId, selectedAccountId)) continue;
    for (const occ of getScheduleOccurrencesInRange(schedule, today, rangeEnd, "expense")) {
      const occurrenceKey = occ.id;
      const originalDate = formatDateKey(occ.date);
      const adjustment = adjustmentByKey.get(occurrenceKey);
      const effectiveDate =
        adjustment?.status === "APPROVED" ? adjustment.adjustedDate : originalDate;

      rawEvents.push({
        occurrenceKey,
        scheduleId: occ.scheduleId,
        name: occ.name,
        amount: occ.amount,
        type: "expense",
        originalDate,
        effectiveDate,
        priority: priorityByScheduleId.get(occ.scheduleId) ?? 50,
        color: occ.color,
        categoryName: occ.categoryName,
        adjustment,
      });
    }
  }

  const sorted = [...rawEvents].sort((a, b) => {
    const dateCmp = a.effectiveDate.localeCompare(b.effectiveDate);
    if (dateCmp !== 0) return dateCmp;
    if (a.type !== b.type) return a.type === "income" ? -1 : 1;
    if (a.type === "expense" && b.type === "expense") {
      return a.priority - b.priority;
    }
    return 0;
  });

  let balance = startingBalance;
  let lowestBalance = startingBalance;
  let lowestBalanceDate: string | null = formatDateKey(today);
  let totalIncome = 0;
  let totalExpenses = 0;
  let shortfallCount = 0;

  const pendingAdjustmentCount = adjustments.filter((a) => a.status === "PENDING").length;

  const events: PlannerEvent[] = sorted
    .filter((event) => event.effectiveDate >= formatDateKey(today) && event.effectiveDate <= formatDateKey(rangeEnd))
    .map((event) => {
    const runningBalance = balance;
    const delta = event.type === "income" ? event.amount : -event.amount;
    balance += delta;

    if (event.type === "income") totalIncome += event.amount;
    else totalExpenses += event.amount;

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestBalanceDate = event.effectiveDate;
    }

    let status: PlannerEventStatus = "ok";
    if (event.adjustment?.status === "PENDING") {
      status = "pending_move";
    } else if (event.type === "expense" && balance < 0) {
      status = "shortfall";
      shortfallCount += 1;
    }

    return {
      id: event.occurrenceKey,
      occurrenceKey: event.occurrenceKey,
      scheduleId: event.scheduleId,
      name: event.name,
      amount: event.amount,
      type: event.type,
      originalDate: event.originalDate,
      effectiveDate: event.effectiveDate,
      priority: event.priority,
      runningBalance,
      balanceAfter: balance,
      status,
      color: event.color,
      categoryName: event.categoryName,
      adjustment: event.adjustment,
    };
  });

  return {
    accountId: selectedAccountId,
    accountName: selectedAccount?.name ?? null,
    rangeStart: formatDateKey(today),
    rangeEnd: formatDateKey(rangeEnd),
    startingBalance,
    summary: {
      startingBalance,
      endingBalance: balance,
      totalIncome,
      totalExpenses,
      lowestBalance,
      lowestBalanceDate,
      shortfallCount,
      pendingAdjustmentCount,
    },
    events,
    adjustments: adjustments.map((a) => ({
      id: a.id,
      occurrenceKey: a.occurrenceKey,
      originalDate: formatDateKey(a.originalDate),
      adjustedDate: formatDateKey(a.adjustedDate),
      status: a.status as PlannerAdjustment["status"],
      notes: a.notes,
    })),
    expensePriorities: scheduledExpenses.map((e) => ({
      scheduleId: e.id,
      name: e.name,
      priority: (e as { priority?: number }).priority ?? 50,
    })),
  };
}

export async function createScheduleDateAdjustment(input: {
  sourceType: "INCOME" | "EXPENSE";
  scheduleId: string;
  occurrenceKey: string;
  originalDate: string;
  adjustedDate: string;
  notes?: string | null;
}) {
  const existing = await db.scheduleDateAdjustment.findUnique({
    where: { occurrenceKey: input.occurrenceKey },
  });

  if (existing) {
    return db.scheduleDateAdjustment.update({
      where: { id: existing.id },
      data: {
        adjustedDate: new Date(input.adjustedDate),
        status: "PENDING",
        notes: input.notes ?? null,
        updatedAt: new Date(),
      },
    });
  }

  return db.scheduleDateAdjustment.create({
    data: {
      sourceType: input.sourceType,
      scheduleId: input.scheduleId,
      occurrenceKey: input.occurrenceKey,
      originalDate: new Date(input.originalDate),
      adjustedDate: new Date(input.adjustedDate),
      status: "PENDING",
      notes: input.notes ?? null,
    },
  });
}

export async function updateScheduleDateAdjustment(
  id: string,
  status: "APPROVED" | "REJECTED"
) {
  if (status === "REJECTED") {
    await db.scheduleDateAdjustment.delete({ where: { id } });
    return { id, status: "REJECTED" as const };
  }

  const updated = await db.scheduleDateAdjustment.update({
    where: { id },
    data: { status: "APPROVED", updatedAt: new Date() },
  });

  return updated;
}

export async function updateExpensePriority(scheduleId: string, priority: number) {
  const clamped = Math.max(1, Math.min(100, Math.round(priority)));
  return db.scheduledExpense.update({
    where: { id: scheduleId },
    data: { priority: clamped },
  });
}
