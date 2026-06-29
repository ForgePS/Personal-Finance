import type { Metadata } from "next";
import { db } from "@/lib/db";
import { TransactionsPageClient } from "@/components/transactions-page-client";

export const metadata: Metadata = {
  title: "Transactions | Money Command",
  description: "View and manage all transactions",
};

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const { accountId } = await searchParams;

  const [transactions, accountFilter] = await Promise.all([
    db.transaction.findMany({
      where: accountId ? { accountId } : undefined,
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    accountId
      ? db.account.findUnique({
          where: { id: accountId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <TransactionsPageClient
      initialTransactions={transactions.map((tx) => ({
        id: tx.id,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        description: tx.description,
        merchant: tx.merchant,
        notes: tx.notes,
        amount: tx.amount,
        date: tx.date,
        category: tx.category,
        account: tx.account ? { name: tx.account.name, color: tx.account.color } : null,
      }))}
      accountFilter={accountFilter}
    />
  );
}
