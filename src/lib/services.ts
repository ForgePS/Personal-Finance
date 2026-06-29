import { db } from "@/lib/db";
import { isLiability } from "@/lib/constants";
import { getMonthEnd, getMonthStart } from "@/lib/utils";
import { startOfMonth, subMonths } from "date-fns";

export async function getDashboardData(month?: Date) {
  const targetMonth = month ?? new Date();
  const monthStart = getMonthStart(targetMonth);
  const monthEnd = getMonthEnd(targetMonth);

  const accounts = await db.account.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });

  const assets = accounts
    .filter((a) => !isLiability(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  const liabilities = accounts
    .filter((a) => isLiability(a.type))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const netWorth = assets - liabilities;

  const monthTransactions = await db.transaction.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      isTransfer: false,
    },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  const income = monthTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = monthTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const spendingByCategory = monthTransactions
    .filter((t) => t.amount < 0 && t.category)
    .reduce(
      (acc, t) => {
        const name = t.category!.name;
        acc[name] = (acc[name] || 0) + Math.abs(t.amount);
        return acc;
      },
      {} as Record<string, number>
    );

  const categorySpending = Object.entries(spendingByCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const cashFlowHistory = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const m = startOfMonth(subMonths(targetMonth, 5 - i));
      const mEnd = getMonthEnd(m);
      const txs = await db.transaction.findMany({
        where: {
          date: { gte: m, lte: mEnd },
          isTransfer: false,
        },
      });
      const inc = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return {
        month: m.toLocaleDateString("en-US", { month: "short" }),
        income: inc,
        expenses: exp,
        net: inc - exp,
      };
    })
  );

  const recentTransactions = await db.transaction.findMany({
    take: 8,
    orderBy: { date: "desc" },
    include: { category: true, account: true },
  });

  const goals = await db.goal.findMany({
    orderBy: { targetDate: "asc" },
    include: { account: true },
  });

  return {
    accounts,
    netWorth,
    assets,
    liabilities,
    income,
    expenses,
    savings: income - expenses,
    categorySpending,
    cashFlowHistory,
    recentTransactions,
    goals,
    monthStart,
  };
}

export async function getBudgetData(month?: Date) {
  const targetMonth = startOfMonth(month ?? new Date());
  const monthEnd = getMonthEnd(targetMonth);

  const budgets = await db.budget.findMany({
    where: { month: targetMonth },
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });

  const transactions = await db.transaction.findMany({
    where: {
      date: { gte: targetMonth, lte: monthEnd },
      isTransfer: false,
      amount: { lt: 0 },
    },
    include: { category: true },
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

  return budgets.map((budget) => {
    const spent = spentByCategory[budget.categoryId] || 0;
    const remaining = budget.amount - spent;
    const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    return {
      ...budget,
      spent,
      remaining,
      percent,
      isOver: spent > budget.amount,
    };
  });
}

export async function recalculateAccountBalance(accountId: string) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  const transactions = await db.transaction.findMany({
    where: { accountId },
  });

  const baseBalance = account.type === "CHECKING" || account.type === "SAVINGS" || account.type === "INVESTMENT" || account.type === "CASH"
    ? 0
    : 0;

  const transactionSum = transactions.reduce((sum, t) => sum + t.amount, 0);

  const seedBalances: Record<string, number> = {};
  const allAccounts = await db.account.findMany();
  for (const a of allAccounts) {
    seedBalances[a.id] = a.balance;
  }

  const currentStored = seedBalances[accountId] ?? 0;
  const txOnlySum = transactionSum;

  if (transactions.length > 0) {
    const initialBalance = currentStored - txOnlySum;
    await db.account.update({
      where: { id: accountId },
      data: { balance: initialBalance + transactionSum },
    });
  }
}

export async function updateAccountBalanceFromTransaction(
  accountId: string,
  amount: number,
  previousAmount?: number
) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  let adjustment = amount;
  if (previousAmount !== undefined) {
    adjustment = amount - previousAmount;
  }

  await db.account.update({
    where: { id: accountId },
    data: { balance: account.balance + adjustment },
  });
}
