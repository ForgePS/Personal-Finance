"use client";

import { useState } from "react";
import { TransactionRow } from "@/components/transaction-row";
import {
  EditTransactionModal,
  type EditableTransaction,
} from "@/components/modals/edit-transaction-modal";

export interface TransactionListItem {
  id: string;
  accountId: string;
  transferAccountId?: string | null;
  debtAccountId?: string | null;
  isTransfer?: boolean;
  categoryId?: string | null;
  description: string;
  merchant?: string | null;
  notes?: string | null;
  amount: number;
  date: Date | string;
  category?: { name: string; color: string; icon: string } | null;
  account?: { name: string; color: string } | null;
  transferAccount?: { name: string; color: string } | null;
  debtAccount?: { name: string; color: string } | null;
}

export function EditableTransactionList({
  transactions,
  showAccount = false,
  emptyMessage = "No transactions yet",
}: {
  transactions: TransactionListItem[];
  showAccount?: boolean;
  emptyMessage?: string;
}) {
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            id={tx.id}
            description={tx.description}
            merchant={tx.merchant}
            amount={tx.amount}
            date={tx.date}
            category={tx.category}
            account={showAccount || tx.isTransfer || tx.debtAccountId ? tx.account : undefined}
            transferAccount={tx.isTransfer ? tx.transferAccount : undefined}
            debtAccount={tx.debtAccountId ? tx.debtAccount : undefined}
            isTransfer={tx.isTransfer}
            onClick={() =>
              setEditing({
                id: tx.id,
                accountId: tx.accountId,
                transferAccountId: tx.transferAccountId,
                debtAccountId: tx.debtAccountId,
                isTransfer: tx.isTransfer,
                categoryId: tx.categoryId,
                description: tx.description,
                merchant: tx.merchant,
                notes: tx.notes,
                amount: tx.amount,
                date: tx.date,
              })
            }
          />
        ))}
      </div>

      <EditTransactionModal
        transaction={editing}
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
