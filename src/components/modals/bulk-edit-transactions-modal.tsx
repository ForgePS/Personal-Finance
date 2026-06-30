"use client";

import { useEffect, useMemo, useState } from "react";
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

const NO_CHANGE = "__no_change__";

export function BulkEditTransactionsModal({
  isOpen,
  onClose,
  onSuccess,
  selectedIds,
  selectedTransactions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedIds: string[];
  selectedTransactions: { id: string; amount: number }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryId, setCategoryId] = useState(NO_CHANGE);
  const [accountId, setAccountId] = useState(NO_CHANGE);
  const [date, setDate] = useState("");
  const [changeDate, setChangeDate] = useState(false);
  const [debtPayment, setDebtPayment] = useState<"no_change" | "clear" | "set">("no_change");
  const [debtAccountId, setDebtAccountId] = useState("");

  const allExpenses = selectedTransactions.every((tx) => tx.amount < 0);
  const allIncome = selectedTransactions.every((tx) => tx.amount > 0);
  const categoryType = allExpenses ? "EXPENSE" : allIncome ? "INCOME" : null;

  const accountOptions = useMemo(
    () => [{ value: NO_CHANGE, label: "No change" }, ...buildAccountSelectOptions(accounts)],
    [accounts]
  );
  const liabilityOptions = useMemo(() => buildLiabilityAccountOptions(accounts), [accounts]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setCategoryId(NO_CHANGE);
    setAccountId(NO_CHANGE);
    setDate("");
    setChangeDate(false);
    setDebtPayment("no_change");
    setDebtAccountId("");
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accts: Account[]) => setAccounts(accts));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const updates: Record<string, unknown> = {};

    if (categoryId !== NO_CHANGE) {
      updates.categoryId = categoryId || null;
    }
    if (accountId !== NO_CHANGE) {
      updates.accountId = accountId;
    }
    if (changeDate && date) {
      updates.date = date;
    }
    if (debtPayment === "clear") {
      updates.clearDebtPayment = true;
    } else if (debtPayment === "set" && debtAccountId) {
      updates.debtAccountId = debtAccountId;
    }

    if (Object.keys(updates).length === 0) {
      setError("Choose at least one field to update");
      setLoading(false);
      return;
    }

    if (debtPayment === "set" && !debtAccountId) {
      setError("Select a debt account");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update transactions");
        return;
      }

      if (data.updated === 0) {
        setError("No transactions were updated. Check category type or debt payment rules.");
        return;
      }

      router.refresh();
      onSuccess?.();
      onClose();
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (value: string) => {
    if (isAccountOptionHeader(value)) return;
    setAccountId(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${selectedIds.length} transactions`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Only fields you change will be applied. Leave others as &quot;No change&quot;.
        </p>

        {categoryType ? (
          <CategorySelectField
            type={categoryType}
            value={categoryId === NO_CHANGE ? "" : categoryId}
            onChange={(id) => setCategoryId(id || NO_CHANGE)}
            label="Category"
            emptyLabel="No change"
          />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Category can&apos;t be bulk-changed when both income and expenses are selected.
          </div>
        )}

        <Select
          label="Paid from account"
          value={accountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          options={accountOptions}
        />

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={changeDate}
              onChange={(e) => setChangeDate(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Change date
          </label>
          {changeDate && (
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          )}
        </div>

        {allExpenses && liabilityOptions.length > 0 && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Payment toward debt</p>
            <div className="flex flex-col gap-2 text-sm">
              {(["no_change", "clear", "set"] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 text-slate-700">
                  <input
                    type="radio"
                    name="debtPayment"
                    checked={debtPayment === option}
                    onChange={() => setDebtPayment(option)}
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {option === "no_change"
                    ? "No change"
                    : option === "clear"
                      ? "Clear debt payment link"
                      : "Set debt account"}
                </label>
              ))}
            </div>
            {debtPayment === "set" && (
              <Select
                label="Debt account"
                value={debtAccountId}
                onChange={(e) => setDebtAccountId(e.target.value)}
                options={[
                  { value: "", label: "Select debt account..." },
                  ...liabilityOptions,
                ]}
              />
            )}
          </div>
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
            {loading ? "Applying..." : "Apply changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
