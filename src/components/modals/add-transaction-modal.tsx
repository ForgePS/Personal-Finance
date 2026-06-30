"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategorySelectField } from "@/components/category-select-field";
import {
  buildAccountSelectOptions,
  buildLiabilityAccountOptions,
  isAccountOptionHeader,
} from "@/lib/account-utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
  type: string;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  defaultAccountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultAccountId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    accountId: defaultAccountId || "",
    debtAccountId: "",
    categoryId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    description: "",
    merchant: "",
    type: "expense" as "expense" | "income",
    isDebtPayment: false,
  });

  const accountOptions = useMemo(() => buildAccountSelectOptions(accounts), [accounts]);
  const liabilityOptions = useMemo(() => buildLiabilityAccountOptions(accounts), [accounts]);
  const isExpense = form.type === "expense";

  useEffect(() => {
    if (isOpen) {
      setError("");
      fetch("/api/accounts")
        .then((r) => r.json())
        .then((accts: Account[]) => {
          setAccounts(accts);
          if (!form.accountId && accts.length > 0) {
            setForm((f) => ({
              ...f,
              accountId: defaultAccountId || accts[0].id,
            }));
          }
        });
    }
  }, [isOpen, defaultAccountId, form.accountId]);

  const categoryType = form.type === "income" ? "INCOME" : "EXPENSE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: form.accountId,
          categoryId: form.categoryId || null,
          debtAccountId: form.isDebtPayment ? form.debtAccountId : null,
          date: form.date,
          amount,
          description: form.description,
          merchant: form.merchant || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add transaction");
        return;
      }

      router.refresh();
      onClose();
      setForm({
        accountId: defaultAccountId || "",
        debtAccountId: "",
        categoryId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        description: "",
        merchant: "",
        type: "expense",
        isDebtPayment: false,
      });
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (value: string) => {
    if (isAccountOptionHeader(value)) return;
    setForm((f) => ({ ...f, accountId: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
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
          placeholder={
            form.isDebtPayment ? "e.g. Credit card payment" : "What was this for?"
          }
        />
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          placeholder="0.00"
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
          emptyLabel="Select category..."
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
                  Categorize this expense as paying down a loan or credit card. The debt
                  balance will be reduced.
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
          placeholder="e.g. Amazon"
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
