import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { isLiability } from "@/lib/constants";
import { getTransactionAmountForAccount } from "@/lib/transfer-service";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Card } from "@/components/ui/card";
import { AccountTransactionHistory } from "@/components/account-transaction-history";
import { AccountDetailActions } from "@/components/account-detail-actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Account Details | Money Command",
};

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await db.account.findUnique({
    where: { id },
  });

  if (!account) notFound();

  const transactions = await db.transaction.findMany({
    where: { OR: [{ accountId: id }, { transferAccountId: id }] },
    orderBy: { date: "desc" },
    take: 50,
    include: { category: true, account: true, transferAccount: true },
  });

  const mappedTransactions = transactions.map((tx) => {
    const amount = getTransactionAmountForAccount(tx, id);
    const isIncomingTransfer = tx.isTransfer && tx.transferAccountId === id;
    return {
      id: tx.id,
      accountId: tx.accountId,
      transferAccountId: tx.transferAccountId,
      isTransfer: tx.isTransfer,
      categoryId: tx.categoryId,
      description: tx.description,
      merchant: tx.merchant,
      notes: tx.notes,
      amount,
      date: tx.date,
      category: tx.category,
      account: isIncomingTransfer && tx.account
        ? { name: tx.account.name, color: tx.account.color }
        : tx.account
          ? { name: tx.account.name, color: tx.account.color }
          : null,
      transferAccount: tx.transferAccount
        ? { name: tx.transferAccount.name, color: tx.transferAccount.color }
        : null,
    };
  });

  const liability = isLiability(account.type);
  const totalIn = mappedTransactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = mappedTransactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-8">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Accounts
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${account.color}20` }}
          >
            <DynamicIcon name={account.icon} className="h-8 w-8" style={{ color: account.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
            <p className="text-sm text-slate-500">
              {account.institution} · {account.type.replace(/_/g, " ")}
            </p>
            <p
              className={`mt-1 text-3xl font-bold tabular-nums ${
                liability ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {liability ? "-" : ""}
              {formatCurrency(Math.abs(account.balance))}
            </p>
          </div>
        </div>
        <AccountDetailActions accountId={account.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Money In</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(totalIn)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Money Out</p>
          <p className="mt-1 text-xl font-bold text-rose-600">{formatCurrency(totalOut)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Transactions</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{mappedTransactions.length}</p>
        </Card>
      </div>

      <Card>
        <AccountTransactionHistory
          accountId={account.id}
          accountName={account.name}
          transactions={mappedTransactions}
        />
      </Card>
    </div>
  );
}
