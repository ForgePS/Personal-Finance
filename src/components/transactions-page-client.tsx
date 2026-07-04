"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EditableTransactionList, type TransactionListItem } from "@/components/editable-transaction-list";
import { AddTransactionModal } from "@/components/modals/add-transaction-modal";
import { Plus, Search, Sparkles, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { buildTransactionsUrl } from "@/lib/transaction-filter-url";
import { buildAccountSelectOptions, type AccountOption } from "@/lib/account-utils";

export function TransactionsPageClient({
  initialTransactions,
  accountFilter,
  categoryFilter,
  monthFilter,
  accounts,
}: {
  initialTransactions: TransactionListItem[];
  accountFilter?: { id: string; name: string } | null;
  categoryFilter?: { id: string; name: string } | null;
  monthFilter?: { key: string; label: string } | null;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "debt">(
    categoryFilter ? "expense" : "all"
  );
  const [autoCatLoading, setAutoCatLoading] = useState(false);
  const selectedAccountId = accountFilter?.id ?? "";

  const accountOptions = useMemo(
    () => [{ value: "", label: "All accounts" }, ...buildAccountSelectOptions(accounts)],
    [accounts]
  );

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (categoryFilter) parts.push(categoryFilter.name);
    if (monthFilter) parts.push(monthFilter.label);
    if (accountFilter) parts.push(accountFilter.name);
    return parts.join(" · ");
  }, [accountFilter, categoryFilter, monthFilter]);

  const clearFiltersHref = buildTransactionsUrl({
    accountId: accountFilter?.id ?? null,
  });

  const filtered = useMemo(() => {
    return initialTransactions.filter((tx) => {
      const matchesSearch =
        !search ||
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.merchant?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.name.toLowerCase().includes(search.toLowerCase()) ||
        tx.account?.name.toLowerCase().includes(search.toLowerCase()) ||
        tx.debtAccount?.name.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "debt" && Boolean(tx.debtAccountId)) ||
        (filter === "income" && !tx.isTransfer && tx.amount > 0) ||
        (filter === "expense" && !tx.isTransfer && tx.amount < 0);

      return matchesSearch && matchesFilter;
    });
  }, [initialTransactions, search, filter]);

  const totalIncome = filtered
    .filter((t) => !t.isTransfer && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => !t.isTransfer && t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const uncategorizedCount = useMemo(
    () =>
      initialTransactions.filter(
        (t) => !t.categoryId && !t.isTransfer && !t.debtAccountId
      ).length,
    [initialTransactions]
  );

  const handleAutoCategorize = async () => {
    setAutoCatLoading(true);
    try {
      const ids = initialTransactions
        .filter((t) => !t.categoryId && !t.isTransfer && !t.debtAccountId)
        .map((t) => t.id);
      const res = await fetch("/api/transactions/auto-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.applied > 0) {
        router.refresh();
      }
    } finally {
      setAutoCatLoading(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    router.push(
      buildTransactionsUrl({
        accountId: accountId || null,
        categoryId: categoryFilter?.id ?? null,
        month: monthFilter?.key ?? null,
      })
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Transactions</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} transactions
            {filterSummary ? ` · ${filterSummary}` : accountFilter ? ` · ${accountFilter.name}` : ""}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {(categoryFilter || monthFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Filtered by:</span>
          {categoryFilter && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {categoryFilter.name}
            </span>
          )}
          {monthFilter && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {monthFilter.label}
            </span>
          )}
          <Link
            href={clearFiltersHref}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Link>
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
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
            <Select
              label="Account"
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              options={accountOptions}
              className="sm:w-56"
            />
          </div>
          <div className="-mx-1 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1 sm:min-w-0 sm:self-end">
              {(["all", "income", "expense", "debt"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`min-h-[40px] shrink-0 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all touch-manipulation ${
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
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Click any row to edit, or use Select for bulk changes</p>
          {uncategorizedCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={autoCatLoading}
              onClick={handleAutoCategorize}
              className="w-full sm:w-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {autoCatLoading
                ? "Learning..."
                : `Auto-categorize ${uncategorizedCount}`}
            </Button>
          )}
        </div>
        <EditableTransactionList
          transactions={filtered}
          showAccount={!accountFilter}
          emptyMessage="No transactions found"
          enableBulkEdit
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
