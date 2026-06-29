import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { isLiability } from "@/lib/constants";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Card, CardHeader } from "@/components/ui/card";
import { TransactionRow } from "@/components/transaction-row";
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
    include: {
      transactions: {
        orderBy: { date: "desc" },
        take: 50,
        include: { category: true },
      },
    },
  });

  if (!account) notFound();

  const liability = isLiability(account.type);
  const totalIn = account.transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = account.transactions
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
          <p className="mt-1 text-xl font-bold text-slate-900">{account.transactions.length}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Transaction History" subtitle="Recent activity on this account" />
        <div className="divide-y divide-slate-100">
          {account.transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No transactions yet</p>
          ) : (
            account.transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                id={tx.id}
                description={tx.description}
                merchant={tx.merchant}
                amount={tx.amount}
                date={tx.date}
                category={tx.category}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
