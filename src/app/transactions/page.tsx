import type { Metadata } from "next";
import { db } from "@/lib/db";
import { TransactionsPageClient } from "@/components/transactions-page-client";

export const metadata: Metadata = {
  title: "Transactions | Money Command",
  description: "View and manage all transactions",
};

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await db.transaction.findMany({
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  return <TransactionsPageClient initialTransactions={transactions} />;
}
