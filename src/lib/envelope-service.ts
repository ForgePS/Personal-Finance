import { db } from "@/lib/db";
import { getMonthEnd } from "@/lib/utils";
import { startOfMonth } from "date-fns";

export interface EnvelopeWithStats {
  id: string;
  categoryId: string;
  month: Date;
  allocated: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverspent: boolean;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export async function getEnvelopeData(month?: Date) {
  const targetMonth = startOfMonth(month ?? new Date());
  const monthEnd = getMonthEnd(targetMonth);

  const expenseCategories = await db.category.findMany({
    where: { type: "EXPENSE" },
    orderBy: { name: "asc" },
  });

  let pool = await db.envelopePool.findUnique({ where: { month: targetMonth } });
  if (!pool) {
    const incomeTx = await db.transaction.findMany({
      where: {
        date: { gte: targetMonth, lte: monthEnd },
        isTransfer: false,
        amount: { gt: 0 },
      },
    });
    const monthlyIncome = incomeTx.reduce((s, t) => s + t.amount, 0);
    pool = await db.envelopePool.create({
      data: { month: targetMonth, totalFunds: monthlyIncome || 0 },
    });
  }

  const existingEnvelopes = await db.envelope.findMany({
    where: { month: targetMonth },
    include: { category: true },
  });

  const envelopeMap = new Map(existingEnvelopes.map((e) => [e.categoryId, e]));

  for (const category of expenseCategories) {
    if (!envelopeMap.has(category.id)) {
      const created = await db.envelope.create({
        data: { categoryId: category.id, month: targetMonth, allocated: 0 },
        include: { category: true },
      });
      envelopeMap.set(category.id, created);
    }
  }

  const transactions = await db.transaction.findMany({
    where: {
      date: { gte: targetMonth, lte: monthEnd },
      isTransfer: false,
      amount: { lt: 0 },
    },
  });

  const spentByCategory = transactions.reduce(
    (acc, t) => {
      if (t.categoryId) {
        acc[t.categoryId] = (acc[t.categoryId] || 0) + Math.abs(t.amount);
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const envelopes: EnvelopeWithStats[] = Array.from(envelopeMap.values())
    .map((envelope) => {
      const spent = spentByCategory[envelope.categoryId] || 0;
      const remaining = envelope.allocated - spent;
      const percentUsed = envelope.allocated > 0 ? (spent / envelope.allocated) * 100 : 0;
      return {
        id: envelope.id,
        categoryId: envelope.categoryId,
        month: envelope.month,
        allocated: envelope.allocated,
        spent,
        remaining,
        percentUsed,
        isOverspent: remaining < 0,
        category: {
          id: envelope.category.id,
          name: envelope.category.name,
          icon: envelope.category.icon,
          color: envelope.category.color,
        },
      };
    })
    .sort((a, b) => a.category.name.localeCompare(b.category.name));

  const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
  const unallocated = pool.totalFunds - totalAllocated;

  const transfers = await db.envelopeTransfer.findMany({
    where: { month: targetMonth },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const categoryNames = new Map(expenseCategories.map((c) => [c.id, c.name]));

  const recentTransfers = transfers.map((t) => ({
    id: t.id,
    amount: t.amount,
    note: t.note,
    createdAt: t.createdAt,
    from: t.fromCategoryId ? categoryNames.get(t.fromCategoryId) ?? "Unknown" : "Unallocated Pool",
    to: t.toCategoryId ? categoryNames.get(t.toCategoryId) ?? "Unknown" : "Unallocated Pool",
  }));

  return {
    month: targetMonth,
    pool: {
      id: pool.id,
      totalFunds: pool.totalFunds,
      totalAllocated,
      totalSpent,
      unallocated,
    },
    envelopes,
    recentTransfers,
    overspentCount: envelopes.filter((e) => e.isOverspent).length,
  };
}

export async function updateEnvelopePool(month: Date, totalFunds: number) {
  const targetMonth = startOfMonth(month);
  return db.envelopePool.upsert({
    where: { month: targetMonth },
    update: { totalFunds },
    create: { month: targetMonth, totalFunds },
  });
}

export async function fundEnvelope(categoryId: string, month: Date, amount: number) {
  const targetMonth = startOfMonth(month);
  const data = await getEnvelopeData(targetMonth);

  if (amount <= 0) throw new Error("Amount must be positive");
  if (amount > data.pool.unallocated) {
    throw new Error("Not enough unallocated funds in the pool");
  }

  const envelope = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId, month: targetMonth } },
  });

  if (!envelope) throw new Error("Envelope not found");

  await db.$transaction([
    db.envelope.update({
      where: { id: envelope.id },
      data: { allocated: envelope.allocated + amount },
    }),
    db.envelopeTransfer.create({
      data: {
        month: targetMonth,
        amount,
        fromCategoryId: null,
        toCategoryId: categoryId,
        note: "Funded from pool",
      },
    }),
  ]);

  return getEnvelopeData(targetMonth);
}

export async function transferBetweenEnvelopes(
  fromCategoryId: string,
  toCategoryId: string,
  month: Date,
  amount: number,
  note?: string
) {
  const targetMonth = startOfMonth(month);
  if (fromCategoryId === toCategoryId) throw new Error("Cannot transfer to the same envelope");
  if (amount <= 0) throw new Error("Amount must be positive");

  const data = await getEnvelopeData(targetMonth);
  const fromEnvelope = data.envelopes.find((e) => e.categoryId === fromCategoryId);
  if (!fromEnvelope) throw new Error("Source envelope not found");
  if (amount > fromEnvelope.remaining) {
    throw new Error("Not enough remaining funds in source envelope");
  }

  const toRecord = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId: toCategoryId, month: targetMonth } },
  });
  if (!toRecord) throw new Error("Destination envelope not found");

  const fromRecord = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId: fromCategoryId, month: targetMonth } },
  });
  if (!fromRecord) throw new Error("Source envelope not found");

  await db.$transaction([
    db.envelope.update({
      where: { id: fromRecord.id },
      data: { allocated: fromRecord.allocated - amount },
    }),
    db.envelope.update({
      where: { id: toRecord.id },
      data: { allocated: toRecord.allocated + amount },
    }),
    db.envelopeTransfer.create({
      data: {
        month: targetMonth,
        amount,
        fromCategoryId,
        toCategoryId,
        note: note || "Envelope transfer",
      },
    }),
  ]);

  return getEnvelopeData(targetMonth);
}

export async function returnToPool(categoryId: string, month: Date, amount: number) {
  const targetMonth = startOfMonth(month);
  if (amount <= 0) throw new Error("Amount must be positive");

  const data = await getEnvelopeData(targetMonth);
  const envelope = data.envelopes.find((e) => e.categoryId === categoryId);
  if (!envelope) throw new Error("Envelope not found");
  if (amount > envelope.remaining) {
    throw new Error("Cannot return more than remaining envelope balance");
  }

  const record = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId, month: targetMonth } },
  });
  if (!record) throw new Error("Envelope not found");

  await db.$transaction([
    db.envelope.update({
      where: { id: record.id },
      data: { allocated: record.allocated - amount },
    }),
    db.envelopeTransfer.create({
      data: {
        month: targetMonth,
        amount,
        fromCategoryId: categoryId,
        toCategoryId: null,
        note: "Returned to pool",
      },
    }),
  ]);

  return getEnvelopeData(targetMonth);
}
