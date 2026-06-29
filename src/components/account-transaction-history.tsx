"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CardHeader } from "@/components/ui/card";
import { EditableTransactionList, type TransactionListItem } from "@/components/editable-transaction-list";

export function AccountTransactionHistory({
  accountId,
  accountName,
  transactions,
}: {
  accountId: string;
  accountName: string;
  transactions: TransactionListItem[];
}) {
  return (
    <>
      <CardHeader
        title="Transaction History"
        subtitle="Click a transaction to edit its category or details"
        action={
          <Link
            href={`/transactions?accountId=${accountId}`}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />
      <EditableTransactionList
        transactions={transactions}
        emptyMessage={`No transactions on ${accountName} yet`}
      />
    </>
  );
}
