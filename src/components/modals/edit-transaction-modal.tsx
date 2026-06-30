"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategorySelectField } from "@/components/category-select-field";
import {
  buildAccountSelectOptions,
  buildLiabilityAccountOptions,
  isAccountOptionHeader,
} from "@/lib/account-utils";

interface Account {
  id: string;
  name: string;
  type: string;
}

export interface EditableTransaction {
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
}

export function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
}: {
  transaction: EditableTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    accountId: "",
    categoryId: "",
    debtAccountId: "",
    date: "",
    amount: "",
    description: "",
    merchant: "",
    notes: "",
    type: "expense" as "expense" | "income",
    isDebtPayment: false,
  });

  const accountOptions = useMemo(() => buildAccountSelectOptions(accounts), [accounts]);
  const liabilityOptions = useMemo(() => buildLiabilityAccountOptions(accounts), [accounts]);
  const isExpense = form.type === "expense";
  const categoryType = form.type === "income" ? "INCOME" : "EXPENSE";
  const isLegacyTransfer = transaction?.isTransfer && transaction.transferAccountId;

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accts: Account[]) => setAccounts(accts));
  }, [isOpen]);

  useEffect(() => {
    if (!transaction || !isOpen) return;

    const dateValue =
      typeof transaction.date === "string"
        ? transaction.date.slice(0, 10)
        : format(new Date(transaction.date), "yyyy-MM-dd");

    setForm({
      accountId: transaction.accountId,
      categoryId: transaction.categoryId || "",
      debtAccountId: transaction.debtAccountId || "",
      date: dateValue,
      amount: String(Math.abs(transaction.amount)),
      description: transaction.description,
      merchant: transaction.merchant || "",
      notes: transaction.notes || "",
      type: transaction.amount >= 0 ? "income" : "expense",
      isDebtPayment: Boolean(transaction.debtAccountId),
    });
  }, [transaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    setError("");

    try {
      const rawAmount = parseFloat(form.amount);
      if (!rawAmount || rawAmount <= 0) {
        setError("Enter an amount greater than zero");
        return;
      }

      if (form.isDebtPayment && !form.debtAccountId) {
        setError("Select which debt this payment applies to");
        return;
      }

      const amount = form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: form.accountId,
          transferAccountId: null,
          isTransfer: false,
          debtAccountId: form.isDebtPayment ? form.debtAccountId : null,
          categoryId: form.categoryId || null,
          date: form.date,
          amount,
          description: form.description,
          merchant: form.merchant || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update transaction");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (!confirm("Delete this transaction?")) return;

    setDeleting(true);
    try {
      await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      router.refresh();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const handleAccountChange = (value: string) => {
    if (isAccountOptionHeader(value)) return;
    setForm((f) => ({ ...f, accountId: value }));
  };

  if (isLegacyTransfer) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Legacy Transfer">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This is an older account-to-account transfer. Delete it and add a new expense with
            &quot;Payment toward debt&quot; if you were paying down a loan or credit card.
          </p>
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
              disabled={deleting}
              className="text-rose-600"
            >
              {deleting ? "Deleting..." : "Delete Transfer"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  type: t,
                  categoryId: "",
                  isDebtPayment: false,
                  debtAccountId: "",
                })
              }
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                form.type === t
                  ? t === "expense"
                    ? "bg-white text-rose-600 shadow-sm"
                    : "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <Select
          label="Paid from account"
          value={form.accountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          options={accountOptions}
        />
        <CategorySelectField
          type={categoryType}
          value={form.categoryId}
          onChange={(categoryId) => setForm({ ...form, categoryId })}
          label="Category"
        />

        {isExpense && liabilityOptions.length > 0 && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isDebtPayment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isDebtPayment: e.target.checked,
                    debtAccountId: e.target.checked ? form.debtAccountId : "",
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="font-medium text-slate-900">Payment toward debt</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Link this expense to a loan or credit card to reduce its balance.
                </span>
              </span>
            </label>
            {form.isDebtPayment && (
              <Select
                label="Debt account"
                value={form.debtAccountId}
                onChange={(e) => setForm({ ...form, debtAccountId: e.target.value })}
                options={[
                  { value: "", label: "Select debt account..." },
                  ...liabilityOptions,
                ]}
              />
            )}
          </div>
        )}

        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <Input
          label="Merchant (optional)"
          value={form.merchant}
          onChange={(e) => setForm({ ...form, merchant: e.target.value })}
        />
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDelete}
            disabled={loading || deleting}
            className="text-rose-600 hover:text-rose-700"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || deleting}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
