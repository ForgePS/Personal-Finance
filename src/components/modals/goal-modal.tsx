"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
}

export interface GoalRecord {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | Date | null;
  color: string;
  icon: string;
  accountId?: string | null;
  account?: { name: string } | null;
}

const GOAL_COLORS = ["#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#f97316", "#ec4899"];

export function GoalModal({
  isOpen,
  onClose,
  goal,
}: {
  isOpen: boolean;
  onClose: () => void;
  goal?: GoalRecord | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
    color: GOAL_COLORS[0],
    accountId: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/accounts")
        .then((r) => r.json())
        .then(setAccounts);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (goal) {
      setForm({
        name: goal.name,
        targetAmount: String(goal.targetAmount),
        currentAmount: String(goal.currentAmount),
        targetDate: goal.targetDate
          ? format(new Date(goal.targetDate), "yyyy-MM-dd")
          : "",
        color: goal.color,
        accountId: goal.accountId ?? "",
      });
    } else {
      setForm({
        name: "",
        targetAmount: "",
        currentAmount: "0",
        targetDate: "",
        color: GOAL_COLORS[0],
        accountId: "",
      });
    }
  }, [isOpen, goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(goal ? `/api/goals/${goal.id}` : "/api/goals", {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          accountId: form.accountId || null,
          targetDate: form.targetDate || null,
        }),
      });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!goal || !confirm(`Delete goal "${goal.name}"?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? "Edit Goal" : "Create Goal"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Goal Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Target Amount"
          type="number"
          step="0.01"
          value={form.targetAmount}
          onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
          required
        />
        <Input
          label="Current Amount"
          type="number"
          step="0.01"
          value={form.currentAmount}
          onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
        />
        <Input
          label="Target Date"
          type="date"
          value={form.targetDate}
          onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
        />
        <Select
          label="Linked Account (optional)"
          value={form.accountId}
          onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          options={[
            { value: "", label: "None" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Color</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm({ ...form, color })}
                className={`h-8 w-8 rounded-full transition-transform ${
                  form.color === color ? "scale-110 ring-2 ring-indigo-500 ring-offset-2" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-between gap-3 pt-2">
          <div>
            {goal && (
              <Button type="button" variant="danger" onClick={handleDelete} disabled={loading}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : goal ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
