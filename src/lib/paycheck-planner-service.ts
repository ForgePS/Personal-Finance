import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { getEnvelopeData } from "@/lib/envelope-service";
import { getScheduleOccurrencesInRange } from "@/lib/schedule-service";
import type { ScheduleInput } from "@/lib/schedule-types";
import { formatDateKey } from "@/lib/utils";
import {
  PLANNER_HORIZON_DAYS,
  type LinkableTransaction,
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
  LinkableTransaction,
  PlannerEnvelopeSummary,
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

function amountsRoughlyMatch(a: number, b: number) {
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  if (absA === 0 || absB === 0) return false;
  const diff = Math.abs(absA - absB);
  return diff <= 5 || diff / Math.max(absA, absB) <= 0.15;
}

type ScheduleOccurrenceCandidate = {
  occurrenceKey: string;
  scheduleId: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  categoryId?: string | null;
};

function suggestOccurrenceMatch(
  tx: { amount: number; date: Date; categoryId?: string | null },
  candidates: ScheduleOccurrenceCandidate[]
) {
  const txDate = formatDateKey(tx.date);
  let best: ScheduleOccurrenceCandidate | undefined;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const dayDiff = Math.abs(differenceInCalendarDays(new Date(txDate), new Date(candidate.date)));
    if (dayDiff > 7) continue;
    if (tx.categoryId && candidate.categoryId && tx.categoryId !== candidate.categoryId) continue;
    if (!amountsRoughlyMatch(tx.amount, candidate.type === "expense" ? -candidate.amount : candidate.amount)) {
      continue;
    }

    const score = dayDiff * 10 + Math.abs(Math.abs(tx.amount) - candidate.amount);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export async function getPaycheckPlannerData(accountId?: string | null): Promise<PaycheckPlannerData> {
  const today = startOfDay(new Date());
  const todayKey = formatDateKey(today);
  const rangeEnd = addDays(today, PLANNER_HORIZON_DAYS);
  const rangeEndKey = formatDateKey(rangeEnd);
  const matchLookback = addDays(today, -14);

  const [accounts, paySchedules, scheduledExpenses, adjustments, envelopeData] = await Promise.all([
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
    getEnvelopeData(today),
  ]);

  const selectedAccount = accountId
    ? accounts.find((a) => a.id === accountId) ?? null
    : pickDefaultAccount(accounts);

  const startingBalance = selectedAccount?.balance ?? 0;
  const selectedAccountId = selectedAccount?.id ?? null;

  const envelopeByCategory = new Map(
    envelopeData.envelopes.map((e) => [
      e.categoryId,
      { remaining: e.remaining, allocated: e.allocated, name: e.category.name },
    ])
  );

  const categoryIdByScheduleId = new Map(
    scheduledExpenses.map((e) => [e.id, e.categoryId ?? null])
  );

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

  const accountTransactions = selectedAccountId
    ? await db.transaction.findMany({
        where: {
          accountId: selectedAccountId,
          isTransfer: false,
          date: { gte: matchLookback, lte: rangeEnd },
        },
        include: { category: true },
        orderBy: { date: "asc" },
      })
    : [];

  const fulfilledKeys = new Set(
    accountTransactions
      .map((t) => (t as { scheduleOccurrenceKey?: string | null }).scheduleOccurrenceKey)
      .filter((key): key is string => Boolean(key))
  );

  type RawEvent = {
    occurrenceKey?: string;
    scheduleId?: string;
    transactionId?: string;
    name: string;
    amount: number;
    type: "income" | "expense";
    kind: "scheduled" | "transaction";
    originalDate: string;
    effectiveDate: string;
    priority: number;
    color: string;
    categoryId?: string;
    categoryName?: string;
    adjustment?: PlannerAdjustment;
    linkedTransactionId?: string;
    isFulfilled?: boolean;
  };

  const rawEvents: RawEvent[] = [];
  const occurrenceCandidates: ScheduleOccurrenceCandidate[] = [];

  for (const schedule of paySchedules as ScheduleInput[]) {
    if (!matchesAccount(schedule.accountId, selectedAccountId)) continue;
    for (const occ of getScheduleOccurrencesInRange(schedule, matchLookback, rangeEnd, "income")) {
      const occurrenceKey = occ.id;
      const originalDate = formatDateKey(occ.date);
      const adjustment = adjustmentByKey.get(occurrenceKey);
      const effectiveDate =
        adjustment?.status === "APPROVED" ? adjustment.adjustedDate : originalDate;

      occurrenceCandidates.push({
        occurrenceKey,
        scheduleId: occ.scheduleId,
        name: occ.name,
        amount: occ.amount,
        type: "income",
        date: effectiveDate,
        categoryId: schedule.categoryId,
      });

      const linkedTx = accountTransactions.find(
        (t) => (t as { scheduleOccurrenceKey?: string | null }).scheduleOccurrenceKey === occurrenceKey
      );
      const isFulfilled = fulfilledKeys.has(occurrenceKey);

      if (isFulfilled) {
        rawEvents.push({
          occurrenceKey,
          scheduleId: occ.scheduleId,
          transactionId: linkedTx?.id,
          name: occ.name,
          amount: occ.amount,
          type: "income",
          kind: "scheduled",
          originalDate,
          effectiveDate,
          priority: 0,
          color: occ.color,
          categoryName: occ.categoryName,
          adjustment,
          linkedTransactionId: linkedTx?.id,
          isFulfilled: true,
        });
        continue;
      }

      if (effectiveDate < todayKey || effectiveDate > rangeEndKey) continue;

      rawEvents.push({
        occurrenceKey,
        scheduleId: occ.scheduleId,
        name: occ.name,
        amount: occ.amount,
        type: "income",
        kind: "scheduled",
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
    for (const occ of getScheduleOccurrencesInRange(schedule, matchLookback, rangeEnd, "expense")) {
      const occurrenceKey = occ.id;
      const originalDate = formatDateKey(occ.date);
      const adjustment = adjustmentByKey.get(occurrenceKey);
      const effectiveDate =
        adjustment?.status === "APPROVED" ? adjustment.adjustedDate : originalDate;
      const categoryId = schedule.categoryId ?? undefined;

      occurrenceCandidates.push({
        occurrenceKey,
        scheduleId: occ.scheduleId,
        name: occ.name,
        amount: occ.amount,
        type: "expense",
        date: effectiveDate,
        categoryId: schedule.categoryId,
      });

      const linkedTx = accountTransactions.find(
        (t) => (t as { scheduleOccurrenceKey?: string | null }).scheduleOccurrenceKey === occurrenceKey
      );
      const isFulfilled = fulfilledKeys.has(occurrenceKey);

      if (isFulfilled) {
        rawEvents.push({
          occurrenceKey,
          scheduleId: occ.scheduleId,
          transactionId: linkedTx?.id,
          name: occ.name,
          amount: occ.amount,
          type: "expense",
          kind: "scheduled",
          originalDate,
          effectiveDate,
          priority: priorityByScheduleId.get(occ.scheduleId) ?? 50,
          color: occ.color,
          categoryId,
          categoryName: occ.categoryName,
          adjustment,
          linkedTransactionId: linkedTx?.id,
          isFulfilled: true,
        });
        continue;
      }

      if (effectiveDate < todayKey || effectiveDate > rangeEndKey) continue;

      rawEvents.push({
        occurrenceKey,
        scheduleId: occ.scheduleId,
        name: occ.name,
        amount: occ.amount,
        type: "expense",
        kind: "scheduled",
        originalDate,
        effectiveDate,
        priority: priorityByScheduleId.get(occ.scheduleId) ?? 50,
        color: occ.color,
        categoryId,
        categoryName: occ.categoryName,
        adjustment,
      });
    }
  }

  for (const tx of accountTransactions) {
    const txKey = formatDateKey(tx.date);
    if (txKey <= todayKey) continue;
    if ((tx as { scheduleOccurrenceKey?: string | null }).scheduleOccurrenceKey) continue;

    rawEvents.push({
      transactionId: tx.id,
      name: tx.description,
      amount: Math.abs(tx.amount),
      type: tx.amount >= 0 ? "income" : "expense",
      kind: "transaction",
      originalDate: txKey,
      effectiveDate: txKey,
      priority: tx.amount < 0 ? 50 : 0,
      color: tx.amount >= 0 ? "#22c55e" : "#f97316",
      categoryId: tx.categoryId ?? undefined,
      categoryName: tx.category?.name,
    });
  }

  const projectionEvents = rawEvents.filter((event) => !event.isFulfilled);
  const fulfilledEventsRaw = rawEvents.filter((event) => event.isFulfilled);

  const sorted = [...projectionEvents].sort((a, b) => {
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
  let lowestBalanceDate: string | null = todayKey;
  let totalIncome = 0;
  let totalExpenses = 0;
  let shortfallCount = 0;
  let envelopeShortfallCount = 0;

  const balanceAnchor: PlannerEvent = {
    id: "balance-anchor",
    name: "Current balance",
    amount: startingBalance,
    type: "income",
    kind: "balance",
    originalDate: todayKey,
    effectiveDate: todayKey,
    priority: 0,
    runningBalance: startingBalance,
    balanceAfter: startingBalance,
    status: "ok",
    color: "#6366f1",
  };

  const buildPlannerEvent = (
    event: RawEvent,
    runningBalance: number,
    balanceAfter: number,
    status: PlannerEventStatus,
    envelopeRemaining?: number | null,
    envelopeAllocated?: number | null
  ): PlannerEvent => ({
    id: event.occurrenceKey ?? event.transactionId ?? `${event.name}-${event.effectiveDate}`,
    occurrenceKey: event.occurrenceKey,
    scheduleId: event.scheduleId,
    transactionId: event.transactionId,
    name: event.name,
    amount: event.amount,
    type: event.type,
    kind: event.kind,
    originalDate: event.originalDate,
    effectiveDate: event.effectiveDate,
    priority: event.priority,
    runningBalance,
    balanceAfter,
    status,
    color: event.color,
    categoryId: event.categoryId,
    categoryName: event.categoryName,
    envelopeRemaining,
    envelopeAllocated,
    linkedTransactionId: event.linkedTransactionId,
    adjustment: event.adjustment,
  });

  const events: PlannerEvent[] = [balanceAnchor];

  for (const event of sorted) {
    const runningBalance = balance;
    const delta = event.type === "income" ? event.amount : -event.amount;
    balance += delta;

    if (event.type === "income") totalIncome += event.amount;
    else totalExpenses += event.amount;

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestBalanceDate = event.effectiveDate;
    }

    const envelope =
      event.type === "expense" && event.categoryId
        ? envelopeByCategory.get(event.categoryId)
        : undefined;

    let status: PlannerEventStatus = "ok";
    if (event.adjustment?.status === "PENDING") {
      status = "pending_move";
    } else if (event.type === "expense" && balance < 0) {
      status = "shortfall";
      shortfallCount += 1;
    } else if (
      event.type === "expense" &&
      envelope &&
      envelope.remaining < event.amount
    ) {
      status = "envelope_shortfall";
      envelopeShortfallCount += 1;
    }

    events.push(
      buildPlannerEvent(
        event,
        runningBalance,
        balance,
        status,
        envelope?.remaining ?? null,
        envelope?.allocated ?? null
      )
    );
  }

  const fulfilledEvents: PlannerEvent[] = fulfilledEventsRaw.map((event) =>
    buildPlannerEvent(event, startingBalance, startingBalance, "fulfilled", null, null)
  );

  const linkableTransactions: LinkableTransaction[] = accountTransactions
    .filter((tx) => !(tx as { scheduleOccurrenceKey?: string | null }).scheduleOccurrenceKey)
    .map((tx) => {
      const suggestion = suggestOccurrenceMatch(tx, occurrenceCandidates);
      return {
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: formatDateKey(tx.date),
        categoryId: tx.categoryId,
        categoryName: tx.category?.name,
        scheduleOccurrenceKey: null,
        suggestedOccurrenceKey: suggestion?.occurrenceKey,
        suggestedScheduleName: suggestion?.name,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const pendingAdjustmentCount = adjustments.filter((a) => a.status === "PENDING").length;

  return {
    accountId: selectedAccountId,
    accountName: selectedAccount?.name ?? null,
    rangeStart: todayKey,
    rangeEnd: rangeEndKey,
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
      fulfilledCount: fulfilledEvents.length,
      envelopeShortfallCount,
    },
    events,
    fulfilledEvents,
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
    envelopeSummary: {
      totalFunds: envelopeData.pool.totalFunds,
      totalAllocated: envelopeData.pool.totalAllocated,
      unallocated: envelopeData.pool.unallocated,
      totalSpent: envelopeData.pool.totalSpent,
    },
    linkableTransactions,
    linkTargets: occurrenceCandidates.map((c) => ({
      occurrenceKey: c.occurrenceKey,
      name: c.name,
      date: c.date,
      amount: c.amount,
      type: c.type,
    })),
  };
}

export async function linkTransactionToOccurrence(
  transactionId: string,
  occurrenceKey: string | null
) {
  return db.transaction.update({
    where: { id: transactionId },
    data: { scheduleOccurrenceKey: occurrenceKey },
  });
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
