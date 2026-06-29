"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategorySelectField } from "@/components/category-select-field";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    accountId: defaultAccountId || "",
    categoryId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    description: "",
    merchant: "",
    type: "expense",
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/accounts").then((r) => r.json()),
      ]).then(([accts]) => {
        setAccounts(accts);
        if (!form.accountId && accts.length > 0) {
          setForm((f) => ({ ...f, accountId: defaultAccountId || accts[0].id }));
        }
      });
    }
  }, [isOpen, defaultAccountId, form.accountId]);

  const categoryType = form.type === "income" ? "INCOME" : "EXPENSE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const rawAmount = parseFloat(form.amount);
      const amount = form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: form.accountId,
          categoryId: form.categoryId || null,
          date: form.date,
          amount,
          description: form.description,
          merchant: form.merchant || null,
        }),
      });
      router.refresh();
      onClose();
      setForm({
        accountId: defaultAccountId || "",
        categoryId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        description: "",
        merchant: "",
        type: "expense",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
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
          placeholder="What was this for?"
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
          label="Account"
          value={form.accountId}
          onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <CategorySelectField
          type={categoryType}
          value={form.categoryId}
          onChange={(categoryId) => setForm({ ...form, categoryId })}
          label="Category"
          emptyLabel="Select category..."
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
          placeholder="e.g. Amazon"
        />
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
