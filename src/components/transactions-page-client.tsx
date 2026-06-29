"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditableTransactionList, type TransactionListItem } from "@/components/editable-transaction-list";
import { AddTransactionModal } from "@/components/modals/add-transaction-modal";
import { Plus, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function TransactionsPageClient({
  initialTransactions,
  accountFilter,
}: {
  initialTransactions: TransactionListItem[];
  accountFilter?: { id: string; name: string } | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = useMemo(() => {
    return initialTransactions.filter((tx) => {
      const matchesSearch =
        !search ||
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.merchant?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.name.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "income" && tx.amount > 0) ||
        (filter === "expense" && tx.amount < 0);

      return matchesSearch && matchesFilter;
    });
  }, [initialTransactions, search, filter]);

  const totalIncome = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} transactions
            {accountFilter ? ` · ${accountFilter.name}` : ""}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {accountFilter && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            Account: {accountFilter.name}
            <Link href="/transactions" className="rounded-full p-0.5 hover:bg-indigo-100">
              <X className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Income</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Expenses</p>
          <p className="mt-1 text-xl font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Net</p>
          <p className="mt-1 text-xl font-bold text-indigo-600">
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["all", "income", "expense"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-500">Click any row to edit category or details</p>
        <EditableTransactionList
          transactions={filtered}
          showAccount={!accountFilter}
          emptyMessage="No transactions found"
        />
      </Card>

      <AddTransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultAccountId={accountFilter?.id}
      />
    </div>
  );
}
