import { db } from "@/lib/db";
import { getMonthEnd } from "@/lib/utils";
import { startOfMonth } from "date-fns";
import { isLiability } from "@/lib/constants";
import { updateAccountBalanceFromTransaction } from "@/lib/services";

export interface EnvelopeTransaction {
  id: string;
  description: string;
  merchant: string | null;
  amount: number;
  date: Date;
  accountName: string;
  isMatched: boolean;
}

export interface EnvelopeWithStats {
  id: string;
  categoryId: string;
  month: Date;
  allocated: number;
  budgetAmount: number | null;
  spent: number;
  remaining: number;
  budgetRemaining: number | null;
  percentUsed: number;
  budgetPercentUsed: number | null;
  isOverspent: boolean;
  isOverBudget: boolean;
  isUnderFunded: boolean;
  transactions: EnvelopeTransaction[];
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface PoolFundingRecord {
  id: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  accountName: string;
}

function isEnvelopeActive(envelope: { isActive?: boolean }) {
  return envelope.isActive !== false;
}

export async function getEnvelopeData(month?: Date) {
  const targetMonth = startOfMonth(month ?? new Date());
  const monthEnd = getMonthEnd(targetMonth);

  const expenseCategories = await db.category.findMany({
    where: { type: "EXPENSE" },
    orderBy: { name: "asc" },
  });
  const categoryNames = new Map(expenseCategories.map((c) => [c.id, c.name]));

  let pool = await db.envelopePool.findUnique({ where: { month: targetMonth } });
  if (!pool) {
    pool = await db.envelopePool.create({
      data: { month: targetMonth, totalFunds: 0 },
    });
  }

  const existingEnvelopes = await db.envelope.findMany({
    where: { month: targetMonth },
    include: { category: true },
  });

  const activeEnvelopes = existingEnvelopes.filter(isEnvelopeActive);

  const transactions = await db.transaction.findMany({
    where: {
      date: { gte: targetMonth, lte: monthEnd },
      isTransfer: false,
      amount: { lt: 0 },
    },
    include: { account: true, category: true },
    orderBy: { date: "desc" },
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

  const transactionsByCategory = transactions.reduce(
    (acc, t) => {
      if (!t.categoryId) return acc;
      if (!acc[t.categoryId]) acc[t.categoryId] = [];
      acc[t.categoryId].push({
        id: t.id,
        description: t.description,
        merchant: t.merchant,
        amount: t.amount,
        date: t.date,
        accountName: t.account?.name ?? "Unknown",
        isMatched: true,
      });
      return acc;
    },
    {} as Record<string, EnvelopeTransaction[]>
  );

  const uncategorizedTransactions: EnvelopeTransaction[] = transactions
    .filter((t) => !t.categoryId)
    .map((t) => ({
      id: t.id,
      description: t.description,
      merchant: t.merchant,
      amount: t.amount,
      date: t.date,
      accountName: t.account?.name ?? "Unknown",
      isMatched: false,
    }));

  const envelopes: EnvelopeWithStats[] = activeEnvelopes
    .map((envelope) => {
      const spent = spentByCategory[envelope.categoryId] || 0;
      const remaining = envelope.allocated - spent;
      const percentUsed = envelope.allocated > 0 ? (spent / envelope.allocated) * 100 : 0;
      const budgetAmount = envelope.budgetAmount ?? null;
      const budgetRemaining = budgetAmount != null ? budgetAmount - spent : null;
      const budgetPercentUsed =
        budgetAmount != null && budgetAmount > 0 ? (spent / budgetAmount) * 100 : null;
      return {
        id: envelope.id,
        categoryId: envelope.categoryId,
        month: envelope.month,
        allocated: envelope.allocated,
        budgetAmount,
        spent,
        remaining,
        budgetRemaining,
        percentUsed,
        budgetPercentUsed,
        isOverspent: remaining < 0,
        isOverBudget: budgetAmount != null && spent > budgetAmount,
        isUnderFunded: budgetAmount != null && envelope.allocated < budgetAmount,
        transactions: transactionsByCategory[envelope.categoryId] ?? [],
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
  const totalBudgeted = envelopes.reduce((s, e) => s + (e.budgetAmount ?? 0), 0);
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);
  const unallocated = pool.totalFunds - totalAllocated;

  const transfers = await db.envelopeTransfer.findMany({
    where: { month: targetMonth },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const recentTransfers = transfers.map((t) => ({
    id: t.id,
    amount: t.amount,
    note: t.note,
    createdAt: t.createdAt,
    from: t.fromCategoryId ? categoryNames.get(t.fromCategoryId) ?? "Unknown" : "Unallocated Pool",
    to: t.toCategoryId ? categoryNames.get(t.toCategoryId) ?? "Unknown" : "Unallocated Pool",
  }));

  const poolFundings = await db.envelopePoolFunding.findMany({
    where: { month: targetMonth },
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });

  const recentPoolFundings: PoolFundingRecord[] = poolFundings.map((f) => ({
    id: f.id,
    amount: f.amount,
    note: f.note,
    createdAt: f.createdAt,
    accountName: f.account?.name ?? "Unknown account",
  }));

  const activeCategoryIds = new Set(activeEnvelopes.map((e) => e.categoryId));
  const availableCategories = expenseCategories
    .filter((c) => c.budgetable !== false && !activeCategoryIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    }));

  return {
    month: targetMonth,
    pool: {
      id: pool.id,
      totalFunds: pool.totalFunds,
      totalAllocated,
      totalBudgeted,
      totalSpent,
      unallocated,
    },
    envelopes,
    recentTransfers,
    recentPoolFundings,
    uncategorizedTransactions,
    availableCategories,
    overspentCount: envelopes.filter((e) => e.isOverspent).length,
    overBudgetCount: envelopes.filter((e) => e.isOverBudget).length,
  };
}

export async function getAvailableEnvelopeAccounts() {
  const accounts = await db.account.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });

  return accounts
    .filter((account) => !isLiability(account.type))
    .map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
      institution: account.institution,
    }));
}

export async function createEnvelope(
  categoryId: string,
  month: Date,
  budgetAmount?: number | null
) {
  const targetMonth = startOfMonth(month);

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category || category.type !== "EXPENSE") {
    throw new Error("Envelope categories must be expense categories");
  }

  const existing = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId, month: targetMonth } },
  });

  if (existing) {
    if (existing.isActive === false) {
      await db.envelope.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(budgetAmount !== undefined && { budgetAmount }),
        },
      });
      return getEnvelopeData(targetMonth);
    }
    throw new Error("An envelope already exists for this category");
  }

  const normalizedBudget =
    budgetAmount != null && budgetAmount > 0 ? budgetAmount : null;

  await db.envelope.create({
    data: {
      categoryId,
      month: targetMonth,
      allocated: 0,
      budgetAmount: normalizedBudget,
      isActive: true,
    },
  });

  return getEnvelopeData(targetMonth);
}

export async function setEnvelopeBudget(
  envelopeId: string,
  month: Date,
  budgetAmount: number | null
) {
  const targetMonth = startOfMonth(month);
  const envelope = await db.envelope.findUnique({ where: { id: envelopeId } });
  if (!envelope || envelope.isActive === false) {
    throw new Error("Envelope not found");
  }

  const normalizedBudget =
    budgetAmount != null && budgetAmount > 0 ? budgetAmount : null;

  await db.envelope.update({
    where: { id: envelopeId },
    data: { budgetAmount: normalizedBudget },
  });

  return getEnvelopeData(targetMonth);
}

export async function deactivateEnvelope(envelopeId: string, month: Date) {
  const targetMonth = startOfMonth(month);
  const envelope = await db.envelope.findUnique({ where: { id: envelopeId } });
  if (!envelope) throw new Error("Envelope not found");

  if (envelope.allocated > 0) {
    throw new Error("Return allocated funds to the pool before removing this envelope");
  }

  await db.envelope.update({
    where: { id: envelopeId },
    data: { isActive: false },
  });

  return getEnvelopeData(targetMonth);
}

export async function fundPoolFromAccounts(
  month: Date,
  fundings: Array<{ accountId: string; amount: number }>,
  note?: string
) {
  const targetMonth = startOfMonth(month);
  const validFundings = fundings.filter((f) => f.amount > 0);

  if (validFundings.length === 0) {
    throw new Error("Add at least one account with a positive amount");
  }

  const totalAmount = validFundings.reduce((sum, f) => sum + f.amount, 0);
  const accounts = await db.account.findMany({
    where: { id: { in: validFundings.map((f) => f.accountId) } },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const funding of validFundings) {
    const account = accountMap.get(funding.accountId);
    if (!account) throw new Error("Account not found");
    if (account.isArchived) throw new Error(`${account.name} is archived`);
    if (isLiability(account.type)) {
      throw new Error(`${account.name} cannot fund envelopes (liability account)`);
    }
    if (account.balance < funding.amount) {
      throw new Error(`Insufficient balance in ${account.name}`);
    }
  }

  let pool = await db.envelopePool.findUnique({ where: { month: targetMonth } });
  if (!pool) {
    pool = await db.envelopePool.create({
      data: { month: targetMonth, totalFunds: 0 },
    });
  }

  for (const funding of validFundings) {
    const account = accountMap.get(funding.accountId)!;
    await db.envelopePoolFunding.create({
      data: {
        month: targetMonth,
        accountId: funding.accountId,
        amount: funding.amount,
        note: note ?? null,
      },
    });
    await db.transaction.create({
      data: {
        accountId: funding.accountId,
        amount: -funding.amount,
        description: "Envelope pool funding",
        merchant: null,
        notes: note ?? `Assigned to ${targetMonth.toISOString().slice(0, 7)} envelope pool`,
        date: new Date(),
        isTransfer: true,
      },
    });
    await updateAccountBalanceFromTransaction(funding.accountId, -funding.amount);
  }

  await db.envelopePool.update({
    where: { id: pool.id },
    data: { totalFunds: pool.totalFunds + totalAmount },
  });

  return getEnvelopeData(targetMonth);
}

export async function reconcileTransaction(
  transactionId: string,
  categoryId: string,
  month: Date
) {
  const targetMonth = startOfMonth(month);

  const envelope = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId, month: targetMonth } },
  });
  if (!envelope || envelope.isActive === false) {
    throw new Error("No active envelope found for this category");
  }

  const transaction = await db.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new Error("Transaction not found");
  if (transaction.isTransfer) throw new Error("Transfer transactions cannot be reconciled");

  await db.transaction.update({
    where: { id: transactionId },
    data: { categoryId },
  });

  return getEnvelopeData(targetMonth);
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

  if (!envelope || envelope.isActive === false) throw new Error("Envelope not found");

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
  if (!toRecord || toRecord.isActive === false) throw new Error("Destination envelope not found");

  const fromRecord = await db.envelope.findUnique({
    where: { categoryId_month: { categoryId: fromCategoryId, month: targetMonth } },
  });
  if (!fromRecord || fromRecord.isActive === false) throw new Error("Source envelope not found");

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
  if (!record || record.isActive === false) throw new Error("Envelope not found");

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
