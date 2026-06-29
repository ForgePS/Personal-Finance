"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategorySelectField } from "@/components/category-select-field";
import { buildAccountSelectOptions, isAccountOptionHeader } from "@/lib/account-utils";
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
    fromAccountId: defaultAccountId || "",
    toAccountId: "",
    categoryId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    description: "",
    merchant: "",
    type: "expense" as "expense" | "income" | "transfer",
  });

  const accountOptions = useMemo(() => buildAccountSelectOptions(accounts), [accounts]);

  useEffect(() => {
    if (isOpen) {
      setError("");
      fetch("/api/accounts")
        .then((r) => r.json())
        .then((accts: Account[]) => {
          setAccounts(accts);
          if (!form.fromAccountId && accts.length > 0) {
            setForm((f) => ({
              ...f,
              fromAccountId: defaultAccountId || accts[0].id,
            }));
          }
        });
    }
  }, [isOpen, defaultAccountId, form.fromAccountId]);

  const categoryType = form.type === "income" ? "INCOME" : "EXPENSE";
  const isTransfer = form.type === "transfer";

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

      if (isTransfer) {
        if (!form.fromAccountId || !form.toAccountId) {
          setError("Select both accounts for the transfer");
          return;
        }
        if (form.fromAccountId === form.toAccountId) {
          setError("From and To accounts must be different");
          return;
        }

        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: form.fromAccountId,
            transferAccountId: form.toAccountId,
            isTransfer: true,
            date: form.date,
            amount: rawAmount,
            description: form.description || "Transfer",
            merchant: form.merchant || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create transfer");
          return;
        }
      } else {
        const amount = form.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: form.fromAccountId,
            categoryId: form.categoryId || null,
            date: form.date,
            amount,
            description: form.description,
            merchant: form.merchant || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to add transaction");
          return;
        }
      }

      router.refresh();
      onClose();
      setForm({
        fromAccountId: defaultAccountId || "",
        toAccountId: "",
        categoryId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        description: "",
        merchant: "",
        type: "expense",
      });
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (field: "fromAccountId" | "toAccountId", value: string) => {
    if (isAccountOptionHeader(value)) return;
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
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
          placeholder={isTransfer ? "e.g. Credit card payment" : "What was this for?"}
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
            <p className="text-xs text-slate-500">
              Link money between asset and liability accounts — e.g. checking to credit card payment,
              or checking to savings.
            </p>
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
              emptyLabel="Select category..."
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
          <Input
            label="Merchant (optional)"
            value={form.merchant}
            onChange={(e) => setForm({ ...form, merchant: e.target.value })}
            placeholder="e.g. Amazon"
          />
        )}

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
            {loading ? "Adding..." : isTransfer ? "Add Transfer" : "Add Transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
