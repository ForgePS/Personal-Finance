"use client";

import { EditableTransactionList, type TransactionListItem } from "@/components/editable-transaction-list";

export function DashboardRecentTransactions({
  transactions,
}: {
  transactions: TransactionListItem[];
}) {
  return (
    <EditableTransactionList
      transactions={transactions}
      showAccount
      emptyMessage="No recent transactions"
    />
  );
}
