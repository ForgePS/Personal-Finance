"use client";

import { useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatMonthYear, getMonthKey } from "@/lib/utils";
import { formatFrequencyLabel } from "@/lib/schedule-service";
import { ScheduleModal, type ScheduleRecord } from "@/components/modals/schedule-modal";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface CalendarOccurrence {
  id: string;
  scheduleId: string;
  name: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  color: string;
}

interface PlanningPageClientProps {
  monthKey: string;
  paySchedules: ScheduleRecord[];
  scheduledExpenses: ScheduleRecord[];
  calendar: {
    totalIncome: number;
    totalExpenses: number;
    net: number;
    incomeCount: number;
    expenseCount: number;
    byDay: Record<string, CalendarOccurrence[]>;
  };
}

export function PlanningPageClient({
  monthKey,
  paySchedules,
  scheduledExpenses,
  calendar,
}: PlanningPageClientProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(`${monthKey}-01`));
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<ScheduleRecord | null>(null);
  const [editingExpense, setEditingExpense] = useState<ScheduleRecord | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const leadingBlanks = monthStart.getDay();
  const calendarCells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...days,
  ];

  const navigateMonth = (direction: -1 | 1) => {
    const next = direction === 1 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
    setCurrentMonth(next);
    setSelectedDay(null);
    router.push(`/planning?month=${getMonthKey(next)}`);
  };

  const selectedOccurrences = selectedDay ? calendar.byDay[selectedDay] ?? [] : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Planning Calendar</h1>
            <p className="text-sm text-slate-500">
              Track expected income and scheduled expenses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-slate-900">
            {formatMonthYear(currentMonth)}
          </span>
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Expected Income</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(calendar.totalIncome)}
              </p>
              <p className="text-xs text-slate-400">{calendar.incomeCount} payments</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Scheduled Expenses</p>
              <p className="text-xl font-bold text-rose-600">
                {formatCurrency(calendar.totalExpenses)}
              </p>
              <p className="text-xs text-slate-400">{calendar.expenseCount} bills</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Net This Month</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  calendar.net >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {formatCurrency(calendar.net)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Month Calendar" subtitle="Click a day to see details" />
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (!day) {
                  return <div key={`blank-${i}`} className="min-h-[5.5rem]" />;
                }

                const dayKey = format(day, "yyyy-MM-dd");
                const occurrences = calendar.byDay[dayKey] ?? [];
                const dayIncome = occurrences
                  .filter((o) => o.type === "income")
                  .reduce((s, o) => s + o.amount, 0);
                const dayExpenses = occurrences
                  .filter((o) => o.type === "expense")
                  .reduce((s, o) => s + o.amount, 0);
                const isSelected = selectedDay === dayKey;

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDay(dayKey)}
                    className={cn(
                      "min-h-[5.5rem] rounded-xl border p-1.5 text-left transition-all",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                      !isSameMonth(day, currentMonth) && "opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        isToday(day)
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayIncome > 0 && (
                        <p className="truncate text-[10px] font-medium text-emerald-600">
                          +{formatCurrency(dayIncome)}
                        </p>
                      )}
                      {dayExpenses > 0 && (
                        <p className="truncate text-[10px] font-medium text-rose-600">
                          -{formatCurrency(dayExpenses)}
                        </p>
                      )}
                      {occurrences.slice(0, 2).map((o) => (
                        <div
                          key={o.id}
                          className="truncate rounded px-1 text-[9px] text-white"
                          style={{ backgroundColor: o.color }}
                        >
                          {o.name}
                        </div>
                      ))}
                      {occurrences.length > 2 && (
                        <p className="text-[9px] text-slate-400">
                          +{occurrences.length - 2} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {selectedDay && (
            <Card className="mt-4">
              <CardHeader
                title={format(new Date(selectedDay + "T12:00:00"), "EEEE, MMMM d")}
                subtitle={`${selectedOccurrences.length} scheduled item${
                  selectedOccurrences.length === 1 ? "" : "s"
                }`}
              />
              {selectedOccurrences.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing scheduled for this day.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedOccurrences.map((occ) => (
                    <div key={occ.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: occ.color }}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{occ.name}</p>
                          <p className="text-xs capitalize text-slate-500">{occ.type}</p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          "font-semibold tabular-nums",
                          occ.type === "income" ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {occ.type === "income" ? "+" : "-"}
                        {formatCurrency(occ.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader title="Pay Schedules" subtitle="Expected income" />
              <Button
                size="sm"
                onClick={() => {
                  setEditingIncome(null);
                  setIncomeModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {paySchedules.length === 0 ? (
                <p className="text-sm text-slate-500">No pay schedules yet.</p>
              ) : (
                paySchedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => {
                      setEditingIncome(schedule);
                      setIncomeModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: schedule.color }}
                      />
                      <div>
                        <p className="font-medium text-slate-900">{schedule.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatFrequencyLabel(schedule)}
                          {!schedule.isActive && " · Paused"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(schedule.amount)}
                      </span>
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader title="Scheduled Expenses" subtitle="Recurring bills" />
              <Button
                size="sm"
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {scheduledExpenses.length === 0 ? (
                <p className="text-sm text-slate-500">No scheduled expenses yet.</p>
              ) : (
                scheduledExpenses.map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => {
                      setEditingExpense(expense);
                      setExpenseModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: expense.color }}
                      />
                      <div>
                        <p className="font-medium text-slate-900">{expense.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatFrequencyLabel(expense)}
                          {!expense.isActive && " · Paused"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-rose-600 tabular-nums">
                        {formatCurrency(expense.amount)}
                      </span>
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <ScheduleModal
        isOpen={incomeModalOpen}
        onClose={() => {
          setIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        type="income"
        schedule={editingIncome}
      />
      <ScheduleModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        type="expense"
        schedule={editingExpense}
      />
    </div>
  );
}
