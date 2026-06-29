"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategorySelectField } from "@/components/category-select-field";
import { buildAccountSelectOptions, isAccountOptionHeader } from "@/lib/account-utils";

interface Account {
  id: string;
  name: string;
  type: string;
}

export interface EditableTransaction {
  id: string;
  accountId: string;
  transferAccountId?: string | null;
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
    fromAccountId: "",
    toAccountId: "",
    categoryId: "",
    date: "",
    amount: "",
    description: "",
    merchant: "",
    notes: "",
    type: "expense" as "expense" | "income" | "transfer",
  });

  const accountOptions = useMemo(() => buildAccountSelectOptions(accounts), [accounts]);
  const isTransfer = form.type === "transfer";
  const categoryType = form.type === "income" ? "INCOME" : "EXPENSE";

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

    const transfer = transaction.isTransfer && transaction.transferAccountId;

    setForm({
      fromAccountId: transaction.accountId,
      toAccountId: transaction.transferAccountId || "",
      categoryId: transaction.categoryId || "",
      date: dateValue,
      amount: String(Math.abs(transaction.amount)),
      description: transaction.description,
      merchant: transaction.merchant || "",
      notes: transaction.notes || "",
      type: transfer ? "transfer" : transaction.amount >= 0 ? "income" : "expense",
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

      if (isTransfer) {
        if (!form.fromAccountId || !form.toAccountId) {
          setError("Select both accounts for the transfer");
          return;
        }
        if (form.fromAccountId === form.toAccountId) {
          setError("From and To accounts must be different");
          return;
        }

        const res = await fetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: form.fromAccountId,
            transferAccountId: form.toAccountId,
            isTransfer: true,
            date: form.date,
            amount: rawAmount,
            description: form.description || "Transfer",
            merchant: form.merchant || null,
            notes: form.notes || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update transfer");
          return;
        }
      } else {
        const amount = form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

        const res = await fetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: form.fromAccountId,
            transferAccountId: null,
            isTransfer: false,
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

  const handleAccountChange = (field: "fromAccountId" | "toAccountId", value: string) => {
    if (isAccountOptionHeader(value)) return;
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  type: t,
                  categoryId: t === "transfer" ? "" : form.categoryId,
                  toAccountId: t === "transfer" ? form.toAccountId : "",
                })
              }
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                form.type === t
                  ? t === "expense"
                    ? "bg-white text-rose-600 shadow-sm"
                    : t === "income"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {t === "expense" ? "Expense" : t === "income" ? "Income" : "Transfer"}
            </button>
          ))}
        </div>

        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required={!isTransfer}
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

        {isTransfer ? (
          <>
            <Select
              label="From account"
              value={form.fromAccountId}
              onChange={(e) => handleAccountChange("fromAccountId", e.target.value)}
              options={accountOptions}
            />
            <Select
              label="To account"
              value={form.toAccountId}
              onChange={(e) => handleAccountChange("toAccountId", e.target.value)}
              options={[
                { value: "", label: "Select account..." },
                ...accountOptions,
              ]}
            />
          </>
        ) : (
          <>
            <Select
              label="Account"
              value={form.fromAccountId}
              onChange={(e) => handleAccountChange("fromAccountId", e.target.value)}
              options={accountOptions}
            />
            <CategorySelectField
              type={categoryType}
              value={form.categoryId}
              onChange={(categoryId) => setForm({ ...form, categoryId })}
              label="Category"
            />
          </>
        )}

        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        {!isTransfer && (
          <>
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
          </>
        )}

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
