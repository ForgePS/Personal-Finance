import type { Metadata } from "next";
import { withServerAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { TransactionsPageClient } from "@/components/transactions-page-client";
import { getTransactionDisplayAmountForAccount } from "@/lib/debt-payment-service";
import { accountTransactionWhere } from "@/lib/dashboard-accounts";
import { formatMonthYear, getMonthEnd, parseMonthKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transactions | Money Command",
  description: "View and manage all transactions",
};

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; categoryId?: string; month?: string }>;
}) {
  return withServerAuth(async () => {
  const { accountId, categoryId, month } = await searchParams;
  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : null;
  const monthDate = monthKey ? parseMonthKey(monthKey) : null;

  const whereParts: Record<string, unknown>[] = [];
  if (accountId) {
    whereParts.push(accountTransactionWhere(accountId));
  }
  if (categoryId === "uncategorized") {
    whereParts.push({ categoryId: null });
  } else if (categoryId) {
    whereParts.push({ categoryId });
  }
  if (monthDate) {
    whereParts.push({
      date: {
        gte: monthDate,
        lte: getMonthEnd(monthDate),
      },
    });
  }

  const [transactions, accountFilter, categoryFilter, accounts] = await Promise.all([
    db.transaction.findMany({
      where: whereParts.length > 0 ? { AND: whereParts } : undefined,
      include: { category: true, account: true, transferAccount: true, debtAccount: true },
      orderBy: { date: "desc" },
      take: categoryId || monthKey ? 500 : 200,
    }),
    accountId
      ? db.account.findUnique({
          where: { id: accountId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    categoryId === "uncategorized"
      ? Promise.resolve({ id: "uncategorized", name: "Uncategorized" })
      : categoryId
        ? db.category.findUnique({
            where: { id: categoryId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    db.account.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <TransactionsPageClient
      initialTransactions={transactions.map((tx) => ({
        id: tx.id,
        accountId: tx.accountId,
        transferAccountId: tx.transferAccountId,
        debtAccountId: tx.debtAccountId,
        isTransfer: tx.isTransfer,
        categoryId: tx.categoryId,
        description: tx.description,
        merchant: tx.merchant,
        notes: tx.notes,
        amount: accountId
          ? getTransactionDisplayAmountForAccount(tx, accountId)
          : tx.amount,
        date: tx.date,
        category: tx.category,
        account: tx.account ? { name: tx.account.name, color: tx.account.color } : null,
        transferAccount: tx.transferAccount
          ? { name: tx.transferAccount.name, color: tx.transferAccount.color }
          : null,
        debtAccount: tx.debtAccount
          ? { name: tx.debtAccount.name, color: tx.debtAccount.color }
          : null,
      }))}
      accountFilter={accountFilter}
      categoryFilter={categoryFilter}
      monthFilter={
        monthKey
          ? { key: monthKey, label: formatMonthYear(monthDate!) }
          : null
      }
      accounts={accounts}
    />
  );
  });
}
