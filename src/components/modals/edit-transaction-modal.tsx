"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Account {
  id: string;
  name: string;
}

export interface EditableTransaction {
  id: string;
  accountId: string;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    accountId: "",
    categoryId: "",
    date: "",
    amount: "",
    description: "",
    merchant: "",
    notes: "",
    type: "expense" as "expense" | "income",
  });

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([accts, cats]) => {
      setAccounts(accts);
      setCategories(cats);
    });
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
      date: dateValue,
      amount: String(Math.abs(transaction.amount)),
      description: transaction.description,
      merchant: transaction.merchant || "",
      notes: transaction.notes || "",
      type: transaction.amount >= 0 ? "income" : "expense",
    });
  }, [transaction, isOpen]);

  const filteredCategories = categories.filter(
    (c) => c.type === (form.type === "income" ? "INCOME" : "EXPENSE")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    try {
      const rawAmount = parseFloat(form.amount);
      const amount = form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: form.accountId,
          categoryId: form.categoryId || null,
          date: form.date,
          amount,
          description: form.description,
          merchant: form.merchant || null,
          notes: form.notes || null,
        }),
      });
      router.refresh();
      onClose();
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, type: t, categoryId: "" })}
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
          label="Account"
          value={form.accountId}
          onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
          label="Category"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          options={[
            { value: "", label: "Uncategorized" },
            ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
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
