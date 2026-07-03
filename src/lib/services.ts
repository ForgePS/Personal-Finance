import { db } from "@/lib/db";
import { isBankLinkedAccount } from "@/lib/account-balance";
import { isLiability } from "@/lib/constants";
import { getMonthEnd, getMonthStart } from "@/lib/utils";
import { startOfMonth, subMonths } from "date-fns";
import { accountTransactionWhere } from "@/lib/dashboard-accounts";
import { getTransactionDisplayAmountForAccount } from "@/lib/debt-payment-service";

function transactionAmount<T extends {
  accountId: string;
  transferAccountId?: string | null;
  debtAccountId?: string | null;
  amount: number;
  isTransfer?: boolean;
}>(tx: T, accountId?: string | null) {
  if (!accountId) return tx.amount;
  return getTransactionDisplayAmountForAccount(tx, accountId);
}

export async function getDashboardData(month?: Date, accountId?: string | null) {
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
  const selectedAccount = accountId ? accounts.find((account) => account.id === accountId) : null;
  const accountBalance = selectedAccount?.balance ?? null;

  const monthTransactions = await db.transaction.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      isTransfer: false,
      ...(accountId ? accountTransactionWhere(accountId) : {}),
    },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
  });

  const income = monthTransactions
    .filter((t) => transactionAmount(t, accountId) > 0)
    .reduce((sum, t) => sum + transactionAmount(t, accountId), 0);

  const expenses = monthTransactions
    .filter((t) => transactionAmount(t, accountId) < 0)
    .reduce((sum, t) => sum + Math.abs(transactionAmount(t, accountId)), 0);

  const spendingByCategory = monthTransactions
    .filter((t) => transactionAmount(t, accountId) < 0 && t.category)
    .reduce(
      (acc, t) => {
        const name = t.category!.name;
        acc[name] = (acc[name] || 0) + Math.abs(transactionAmount(t, accountId));
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
          ...(accountId ? accountTransactionWhere(accountId) : {}),
        },
      });
      const inc = txs
        .filter((t) => transactionAmount(t, accountId) > 0)
        .reduce((s, t) => s + transactionAmount(t, accountId), 0);
      const exp = txs
        .filter((t) => transactionAmount(t, accountId) < 0)
        .reduce((s, t) => s + Math.abs(transactionAmount(t, accountId)), 0);
      return {
        month: m.toLocaleDateString("en-US", { month: "short" }),
        income: inc,
        expenses: exp,
        net: inc - exp,
      };
    })
  );

  const recentTransactions = await db.transaction.findMany({
    where: accountId ? accountTransactionWhere(accountId) : undefined,
    take: 8,
    orderBy: { date: "desc" },
    include: { category: true, account: true, transferAccount: true, debtAccount: true },
  });

  const goals = await db.goal.findMany({
    where: accountId ? { accountId } : undefined,
    orderBy: { targetDate: "asc" },
    include: { account: true },
  });

  return {
    accounts,
    accountId: accountId ?? null,
    selectedAccount,
    accountBalance,
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
  });

  const sortedBudgets = [...budgets].sort((a, b) =>
    (a.category?.name ?? "").localeCompare(b.category?.name ?? "")
  );

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

  return sortedBudgets.map((budget) => {
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

export async function updateAccountBalanceFromTransaction(
  accountId: string,
  amount: number,
  previousAmount?: number
) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) return;

  // Bank-linked accounts: balance comes from Plaid sync only, not local math.
  if (isBankLinkedAccount(account)) {
    return;
  }

  let adjustment = amount;
  if (previousAmount !== undefined) {
    adjustment = amount - previousAmount;
  }

  await db.account.update({
    where: { id: accountId },
    data: { balance: account.balance + adjustment },
  });
}
