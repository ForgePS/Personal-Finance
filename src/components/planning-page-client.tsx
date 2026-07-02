"use client";

import { useState, useMemo, useTransition } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
} from "date-fns";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatMonthYear, getMonthKey } from "@/lib/utils";
import { formatFrequencyLabel } from "@/lib/schedule-service";
import { ScheduleModal, type ScheduleRecord } from "@/components/modals/schedule-modal";
import { CollapsibleScheduleSection } from "@/components/collapsible-schedule-section";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
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
  categoryName?: string;
}

interface PlanningCalendar {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  byDay: Record<string, CalendarOccurrence[]>;
}

interface PlanningPageClientProps {
  monthKey: string;
  paySchedules: ScheduleRecord[];
  scheduledExpenses: ScheduleRecord[];
  calendar: PlanningCalendar;
}

export function PlanningPageClient({
  monthKey,
  paySchedules,
  scheduledExpenses,
  calendar,
}: PlanningPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<ScheduleRecord | null>(null);
  const [editingExpense, setEditingExpense] = useState<ScheduleRecord | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalStartDate, setModalStartDate] = useState<string | null>(null);

  const openIncomeModal = (startDate?: string | null) => {
    setEditingIncome(null);
    setModalStartDate(startDate ?? null);
    setIncomeModalOpen(true);
  };

  const openExpenseModal = (startDate?: string | null) => {
    setEditingExpense(null);
    setModalStartDate(startDate ?? null);
    setExpenseModalOpen(true);
  };

  const openScheduleForOccurrence = (occurrence: CalendarOccurrence) => {
    if (occurrence.type === "income") {
      const schedule = paySchedules.find((item) => item.id === occurrence.scheduleId);
      if (!schedule) return;
      setModalStartDate(null);
      setEditingIncome(schedule);
      setIncomeModalOpen(true);
      return;
    }

    const schedule = scheduledExpenses.find((item) => item.id === occurrence.scheduleId);
    if (!schedule) return;
    setModalStartDate(null);
    setEditingExpense(schedule);
    setExpenseModalOpen(true);
  };

  const currentMonth = useMemo(() => new Date(`${monthKey}-01T12:00:00`), [monthKey]);

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
    setSelectedDay(null);
    startTransition(() => {
      router.push(`/planning?month=${getMonthKey(next)}`);
    });
  };

  const selectedOccurrences = selectedDay ? calendar.byDay[selectedDay] ?? [] : [];

  return (
      <div className={cn("space-y-8", isPending && "pointer-events-none opacity-60")}>
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading month...
          </div>
        )}
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
            <CardHeader
              title="Month Calendar"
              subtitle="Tap a day to view details or add income and expenses"
            />

            <div className="space-y-2 lg:hidden">
              {days.map((day) => {
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
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all touch-manipulation",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold",
                        isToday(day)
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      <span className="text-[10px] font-medium uppercase">{format(day, "EEE")}</span>
                      <span className="text-sm">{format(day, "d")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {occurrences.length === 0 ? (
                        <p className="text-sm text-slate-400">Nothing scheduled</p>
                      ) : (
                        <div className="space-y-1">
                          {occurrences.slice(0, 2).map((o) => (
                            <p key={o.id} className="truncate text-sm text-slate-700">
                              <span className={o.type === "income" ? "text-emerald-600" : "text-rose-600"}>
                                {o.type === "income" ? "+" : "-"}
                                {formatCurrency(o.amount)}
                              </span>
                              {" · "}
                              {o.name}
                            </p>
                          ))}
                          {occurrences.length > 2 && (
                            <p className="text-xs text-slate-400">+{occurrences.length - 2} more</p>
                          )}
                        </div>
                      )}
                    </div>
                    {(dayIncome > 0 || dayExpenses > 0) && (
                      <div className="shrink-0 text-right text-xs tabular-nums">
                        {dayIncome > 0 && (
                          <p className="font-medium text-emerald-600">+{formatCurrency(dayIncome)}</p>
                        )}
                        {dayExpenses > 0 && (
                          <p className="font-medium text-rose-600">-{formatCurrency(dayExpenses)}</p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:block">
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
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
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
                      {occurrences.slice(0, 3).map((o) => (
                        <div
                          key={o.id}
                          className="truncate rounded px-1 text-[9px] font-medium text-white"
                          style={{ backgroundColor: o.color }}
                          title={`${o.type === "income" ? "Income" : "Expense"}: ${o.name}`}
                        >
                          {o.type === "income" ? "↑ " : "↓ "}
                          {o.name}
                        </div>
                      ))}
                      {occurrences.length > 3 && (
                        <p className="text-[9px] text-slate-400">
                          +{occurrences.length - 3} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
          </Card>

          {selectedDay && (
            <Card className="mt-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <CardHeader
                  title={format(new Date(selectedDay + "T12:00:00"), "EEEE, MMMM d")}
                  subtitle={`${selectedOccurrences.length} scheduled item${
                    selectedOccurrences.length === 1 ? "" : "s"
                  }`}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openIncomeModal(selectedDay)}>
                    <Plus className="h-4 w-4" />
                    Add Income
                  </Button>
                  <Button size="sm" onClick={() => openExpenseModal(selectedDay)}>
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
              </div>
              {selectedOccurrences.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nothing scheduled for this day yet. Add a one-time income or expense above.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedOccurrences.map((occ) => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => openScheduleForOccurrence(occ)}
                      className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: occ.color }}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{occ.name}</p>
                          <p className="text-xs capitalize text-slate-500">
                            {occ.type === "income" ? "Pay schedule" : "Known expense"}
                            {occ.categoryName ? ` · ${occ.categoryName}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "font-semibold tabular-nums",
                            occ.type === "income" ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {occ.type === "income" ? "+" : "-"}
                          {formatCurrency(occ.amount)}
                        </p>
                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <CollapsibleScheduleSection
              title="Pay Schedules"
              subtitle="Expected income"
              items={paySchedules}
              amountTone="income"
              defaultOpen={false}
              emptyMessage="No pay schedules yet."
              onAdd={() => openIncomeModal()}
            >
              {paySchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => {
                    setModalStartDate(null);
                    setEditingIncome(schedule);
                    setIncomeModalOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: schedule.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{schedule.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatFrequencyLabel(schedule)}
                        {!schedule.isActive && " · Paused"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                      {formatCurrency(schedule.amount)}
                    </span>
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </button>
              ))}
            </CollapsibleScheduleSection>
          </Card>

          <Card className="p-4">
            <CollapsibleScheduleSection
              title="Known Expenses"
              subtitle="Recurring bills from Settings"
              items={scheduledExpenses}
              amountTone="expense"
              defaultOpen={false}
              emptyMessage="No known expenses yet. Add them in Settings → Known Expenses."
              onAdd={() => openExpenseModal()}
            >
              {scheduledExpenses.map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => {
                    setModalStartDate(null);
                    setEditingExpense(expense);
                    setExpenseModalOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: expense.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{expense.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatFrequencyLabel(expense)}
                        {!expense.isActive && " · Paused"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    <span className="text-sm font-semibold text-rose-600 tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </button>
              ))}
            </CollapsibleScheduleSection>
          </Card>
        </div>
      </div>

      <ScheduleModal
        isOpen={incomeModalOpen}
        onClose={() => {
          setIncomeModalOpen(false);
          setEditingIncome(null);
          setModalStartDate(null);
        }}
        type="income"
        schedule={editingIncome}
        defaultStartDate={editingIncome ? null : modalStartDate}
      />
      <ScheduleModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
          setModalStartDate(null);
        }}
        type="expense"
        schedule={editingExpense}
        defaultStartDate={editingExpense ? null : modalStartDate}
      />
    </div>
  );
}
