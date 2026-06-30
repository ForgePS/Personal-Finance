"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionRow } from "@/components/transaction-row";
import { Button } from "@/components/ui/button";
import {
  EditTransactionModal,
  type EditableTransaction,
} from "@/components/modals/edit-transaction-modal";
import { BulkEditTransactionsModal } from "@/components/modals/bulk-edit-transactions-modal";
import { Pencil, Trash2, X } from "lucide-react";

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
  enableBulkEdit = false,
}: {
  transactions: TransactionListItem[];
  showAccount?: boolean;
  emptyMessage?: string;
  enableBulkEdit?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = transactions.length > 0 && selectedCount === transactions.length;

  const selectedTransactions = useMemo(
    () => transactions.filter((tx) => selectedIds.has(tx.id)),
    [transactions, selectedIds]
  );

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setShowBulkEdit(false);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(transactions.map((tx) => tx.id)));
  };

  const toggleSelected = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    if (
      !confirm(
        `Delete ${selectedCount} transaction${selectedCount === 1 ? "" : "s"}? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete transactions");
        return;
      }
      router.refresh();
      exitSelectionMode();
    } finally {
      setDeleting(false);
    }
  };

  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      {enableBulkEdit && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {selectionMode ? (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {selectedCount > 0
                  ? `${selectedCount} selected`
                  : "Select all"}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={selectedCount === 0}
                  onClick={() => setShowBulkEdit(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={selectedCount === 0 || deleting}
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={exitSelectionMode}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button type="button" size="sm" variant="secondary" onClick={() => setSelectionMode(true)}>
              Select
            </Button>
          )}
        </div>
      )}

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
            selectable={selectionMode}
            selected={selectedIds.has(tx.id)}
            onSelect={(selected) => toggleSelected(tx.id, selected)}
            onClick={
              selectionMode
                ? undefined
                : () =>
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

      <BulkEditTransactionsModal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        onSuccess={exitSelectionMode}
        selectedIds={Array.from(selectedIds)}
        selectedTransactions={selectedTransactions.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
        }))}
      />
    </>
  );
}
