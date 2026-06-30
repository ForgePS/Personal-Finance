"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CategorySelectField } from "@/components/category-select-field";
import { useRouter } from "next/navigation";
import {
  SCHEDULE_FREQUENCIES,
  DAYS_OF_WEEK,
  type ScheduleFrequency,
} from "@/lib/schedule-types";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
}

export interface ScheduleRecord {
  id: string;
  name: string;
  amount: number;
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  secondDayOfMonth?: number | null;
  customIntervalDays?: number | null;
  startDate: string;
  endDate?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  color: string;
  icon: string;
  notes?: string | null;
  isActive: boolean;
}

export interface SchedulePrefill {
  name?: string;
  amount?: string | number;
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  notes?: string;
  frequency?: ScheduleFrequency;
}

const INCOME_COLORS = ["#22c55e", "#14b8a6", "#10b981", "#06b6d4", "#3b82f6"];
const EXPENSE_COLORS = ["#f97316", "#ef4444", "#ec4899", "#f59e0b", "#8b5cf6"];

function defaultForm(type: "income" | "expense") {
  return {
    name: "",
    amount: "",
    frequency: "MONTHLY" as ScheduleFrequency,
    dayOfWeek: "5",
    dayOfMonth: "1",
    secondDayOfMonth: "15",
    customIntervalDays: "30",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    categoryId: "",
    accountId: "",
    color: type === "income" ? INCOME_COLORS[0] : EXPENSE_COLORS[0],
    notes: "",
    isActive: true,
  };
}

export function ScheduleModal({
  isOpen,
  onClose,
  type,
  schedule,
  defaultStartDate,
  prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: "income" | "expense";
  schedule?: ScheduleRecord | null;
  defaultStartDate?: string | null;
  prefill?: SchedulePrefill | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(defaultForm(type));

  const colors = type === "income" ? INCOME_COLORS : EXPENSE_COLORS;
  const apiBase = type === "income" ? "/api/pay-schedules" : "/api/scheduled-expenses";
  const title = schedule
    ? type === "income"
      ? "Edit Pay Schedule"
      : "Edit Scheduled Expense"
    : prefill
      ? type === "income"
        ? "Set Up Recurring Income"
        : "Set Up Recurring Expense"
    : type === "income"
      ? "Add Pay Schedule"
      : "Add Scheduled Expense";

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accts) => {
        setAccounts(accts);
      });

    if (schedule) {
      setForm({
        name: schedule.name,
        amount: String(schedule.amount),
        frequency: schedule.frequency,
        dayOfWeek: String(schedule.dayOfWeek ?? 5),
        dayOfMonth: String(schedule.dayOfMonth ?? 1),
        secondDayOfMonth: String(schedule.secondDayOfMonth ?? 15),
        customIntervalDays: String(schedule.customIntervalDays ?? 30),
        startDate: schedule.startDate.slice(0, 10),
        endDate: schedule.endDate ? schedule.endDate.slice(0, 10) : "",
        categoryId: schedule.categoryId ?? "",
        accountId: schedule.accountId ?? "",
        color: schedule.color,
        notes: schedule.notes ?? "",
        isActive: schedule.isActive,
      });
    } else if (prefill) {
      const base = defaultForm(type);
      const startDate = prefill.startDate ?? base.startDate;
      const date = new Date(`${startDate}T12:00:00`);
      setForm({
        ...base,
        name: prefill.name ?? "",
        amount: prefill.amount != null ? String(prefill.amount) : "",
        categoryId: prefill.categoryId ?? "",
        accountId: prefill.accountId ?? "",
        startDate,
        frequency: prefill.frequency ?? "MONTHLY",
        dayOfWeek: String(date.getDay()),
        dayOfMonth: String(date.getDate()),
        notes: prefill.notes ?? "",
      });
    } else if (defaultStartDate) {
      const base = defaultForm(type);
      const date = new Date(`${defaultStartDate}T12:00:00`);
      setForm({
        ...base,
        startDate: defaultStartDate,
        frequency: "ONCE",
        dayOfWeek: String(date.getDay()),
        dayOfMonth: String(date.getDate()),
      });
    } else {
      setForm(defaultForm(type));
    }
  }, [isOpen, schedule, type, defaultStartDate, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        dayOfWeek: ["WEEKLY", "BIWEEKLY"].includes(form.frequency) ? Number(form.dayOfWeek) : null,
        dayOfMonth: ["MONTHLY", "QUARTERLY", "YEARLY", "SEMIMONTHLY"].includes(form.frequency)
          ? Number(form.dayOfMonth)
          : null,
        secondDayOfMonth:
          form.frequency === "SEMIMONTHLY" ? Number(form.secondDayOfMonth) : null,
        customIntervalDays: form.frequency === "CUSTOM" ? Number(form.customIntervalDays) : null,
        categoryId: form.categoryId || null,
        accountId: form.accountId || null,
        endDate: form.endDate || null,
        icon: type === "income" ? "briefcase" : "calendar",
      };

      await fetch(schedule ? `${apiBase}/${schedule.id}` : apiBase, {
        method: schedule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule || !confirm("Delete this schedule?")) return;
    setLoading(true);
    try {
      await fetch(`${apiBase}/${schedule.id}`, { method: "DELETE" });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder={type === "income" ? "e.g. Bi-weekly Paycheck" : "e.g. Rent"}
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
          label="Frequency"
          value={form.frequency}
          onChange={(e) =>
            setForm({ ...form, frequency: e.target.value as ScheduleFrequency })
          }
          options={SCHEDULE_FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
        />

        {["WEEKLY", "BIWEEKLY"].includes(form.frequency) && (
          <Select
            label="Day of Week"
            value={form.dayOfWeek}
            onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
            options={DAYS_OF_WEEK.map((d) => ({ value: String(d.value), label: d.label }))}
          />
        )}

        {["MONTHLY", "QUARTERLY", "YEARLY", "SEMIMONTHLY"].includes(form.frequency) && (
          <Input
            label="Day of Month"
            type="number"
            min="1"
            max="31"
            value={form.dayOfMonth}
            onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
          />
        )}

        {form.frequency === "SEMIMONTHLY" && (
          <Input
            label="Second Day of Month"
            type="number"
            min="1"
            max="31"
            value={form.secondDayOfMonth}
            onChange={(e) => setForm({ ...form, secondDayOfMonth: e.target.value })}
          />
        )}

        {form.frequency === "CUSTOM" && (
          <Input
            label="Repeat Every (days)"
            type="number"
            min="1"
            value={form.customIntervalDays}
            onChange={(e) => setForm({ ...form, customIntervalDays: e.target.value })}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
          <Input
            label="End Date (optional)"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CategorySelectField
            type={type === "income" ? "INCOME" : "EXPENSE"}
            value={form.categoryId}
            onChange={(categoryId) => setForm({ ...form, categoryId })}
            label="Category (optional)"
            emptyLabel="None"
          />
          <Select
            label="Account (optional)"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            options={[
              { value: "", label: "None" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>

        <Textarea
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Color</label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
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

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Active (show on calendar)
        </label>

        <div className="flex justify-between gap-3 pt-2">
          <div>
            {schedule && (
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
              {loading
                ? "Saving..."
                : schedule
                  ? "Save Changes"
                  : prefill
                    ? type === "income"
                      ? "Create Recurring Income"
                      : "Create Recurring Expense"
                    : "Add Schedule"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
