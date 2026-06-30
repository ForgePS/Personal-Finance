"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { DynamicIcon } from "@/components/dynamic-icon";
import { formatCurrency } from "@/lib/utils";
import { formatFrequencyLabel } from "@/lib/schedule-service";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Loader2,
  PiggyBank,
  Settings,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PayScheduleOption {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  accountId: string | null;
  accountName: string | null;
}

interface PayCycleBill {
  id: string;
  name: string;
  amount: number;
  date: string;
  categoryName?: string;
}

interface PayCycleAllocation {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  budgetAmount: number | null;
  currentAllocated: number;
  suggestedAmount: number;
}

interface PayCycle {
  id: string;
  payScheduleId: string;
  payScheduleName: string;
  payDate: string;
  cycleEnd: string;
  monthKey: string;
  paycheckAmount: number;
  additionalIncome: number;
  totalIncome: number;
  bills: PayCycleBill[];
  totalBills: number;
  remaining: number;
  allocations: PayCycleAllocation[];
  isShortfall: boolean;
}

interface FundingAccount {
  id: string;
  name: string;
  balance: number;
}

export function PayCyclePageClient({
  paySchedules,
  primaryScheduleId,
  cycles,
  hasScheduledExpenses,
}: {
  paySchedules: PayScheduleOption[];
  primaryScheduleId: string | null;
  cycles: PayCycle[];
  hasScheduledExpenses: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(
    cycles[0]?.id ?? null
  );
  const [allocationInputs, setAllocationInputs] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [poolAmountInputs, setPoolAmountInputs] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<FundingAccount[]>([]);
  const [applyingCycleId, setApplyingCycleId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedSchedule = paySchedules.find((schedule) => schedule.id === primaryScheduleId) ?? null;

  useEffect(() => {
    fetch("/api/envelopes/accounts")
      .then((r) => r.json())
      .then((data: FundingAccount[]) => {
        setAccounts(data);
        const preferred =
          selectedSchedule?.accountId && data.some((a) => a.id === selectedSchedule.accountId)
            ? selectedSchedule.accountId
            : data[0]?.id ?? "";
        setAccountId(preferred);
      });
  }, [selectedSchedule?.accountId]);

  useEffect(() => {
    const nextAllocations: Record<string, Record<string, string>> = {};
    const nextPoolAmounts: Record<string, string> = {};
    for (const cycle of cycles) {
      nextPoolAmounts[cycle.id] = String(Math.max(0, cycle.remaining));
      nextAllocations[cycle.id] = {};
      for (const allocation of cycle.allocations) {
        nextAllocations[cycle.id][allocation.categoryId] = String(allocation.suggestedAmount);
      }
    }
    setAllocationInputs(nextAllocations);
    setPoolAmountInputs(nextPoolAmounts);
    setExpandedCycleId((current) => current ?? cycles[0]?.id ?? null);
  }, [cycles]);

  const handleScheduleChange = (scheduleId: string) => {
    startTransition(() => {
      router.push(`/pay-cycle?scheduleId=${scheduleId}`);
    });
  };

  const getAllocationTotal = (cycleId: string) => {
    const inputs = allocationInputs[cycleId] ?? {};
    return Object.values(inputs).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  };

  const applyCycle = async (cycle: PayCycle) => {
    setApplyingCycleId(cycle.id);
    setError("");

    const poolAmount = parseFloat(poolAmountInputs[cycle.id] ?? "0") || 0;
    const allocations = Object.entries(allocationInputs[cycle.id] ?? {})
      .map(([categoryId, value]) => ({
        categoryId,
        amount: parseFloat(value) || 0,
      }))
      .filter((item) => item.amount > 0);

    if (!accountId) {
      setError("Select an account to fund the envelope pool");
      setApplyingCycleId(null);
      return;
    }

    try {
      const res = await fetch("/api/pay-cycle/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthKey: cycle.monthKey,
          accountId,
          poolAmount,
          allocations,
          note: `Pay cycle ${cycle.payDate}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to apply pay cycle plan");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not apply plan. Check your connection and try again.");
    } finally {
      setApplyingCycleId(null);
    }
  };

  const scheduleOptions = useMemo(
    () => paySchedules.map((schedule) => ({ value: schedule.id, label: schedule.name })),
    [paySchedules]
  );

  if (paySchedules.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="p-8 text-center">
          <PiggyBank className="mx-auto h-10 w-10 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Add a pay schedule first</h2>
          <p className="mt-2 text-sm text-slate-600">
            The pay cycle planner uses your pay schedules to build paycheck windows and suggest
            envelope allocations.
          </p>
          <Link href="/settings?tab=pay-schedules" className="mt-4 inline-block">
            <Button>
              <Settings className="h-4 w-4" />
              Set up pay schedules
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", isPending && "pointer-events-none opacity-60")}>
      <Header />
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pay cycles...
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="p-4">
          <Select
            label="Primary paycheck"
            value={primaryScheduleId ?? ""}
            onChange={(e) => handleScheduleChange(e.target.value)}
            options={scheduleOptions}
          />
          {selectedSchedule && (
            <p className="mt-2 text-sm text-slate-600">
              {formatCurrency(selectedSchedule.amount)} ·{" "}
              {formatFrequencyLabel({
                id: selectedSchedule.id,
                name: selectedSchedule.name,
                amount: selectedSchedule.amount,
                frequency: selectedSchedule.frequency as never,
                startDate: new Date().toISOString(),
              })}
              {selectedSchedule.accountName ? ` · ${selectedSchedule.accountName}` : ""}
            </p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium text-slate-500">Funding account</p>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({formatCurrency(account.balance)})
              </option>
            ))}
          </select>
        </Card>
      </div>

      {!hasScheduledExpenses && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add known expenses in Settings to see bills due before each paycheck.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {cycles.map((cycle) => {
          const expanded = expandedCycleId === cycle.id;
          const allocationTotal = getAllocationTotal(cycle.id);
          const poolAmount = parseFloat(poolAmountInputs[cycle.id] ?? "0") || 0;
          const unassignedPool = poolAmount - allocationTotal;

          return (
            <Card key={cycle.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedCycleId(expanded ? null : cycle.id)}
                className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    {format(parseISO(cycle.payDate), "MMM d")} –{" "}
                    {format(parseISO(cycle.cycleEnd), "MMM d, yyyy")}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {cycle.payScheduleName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {cycle.bills.length} bill{cycle.bills.length === 1 ? "" : "s"} due this cycle
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Left to allocate</p>
                    <p
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        cycle.isShortfall ? "text-rose-600" : "text-emerald-600"
                      )}
                    >
                      {formatCurrency(cycle.remaining)}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp className="mt-1 h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="mt-1 h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <SummaryStat label="Paycheck" value={cycle.paycheckAmount} tone="income" />
                    <SummaryStat label="Bills due" value={cycle.totalBills} tone="expense" />
                    <SummaryStat
                      label="Remaining"
                      value={cycle.remaining}
                      tone={cycle.isShortfall ? "shortfall" : "neutral"}
                    />
                  </div>

                  {cycle.isShortfall && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Bills due this cycle exceed expected income by{" "}
                      {formatCurrency(Math.abs(cycle.remaining))}.
                    </div>
                  )}

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div>
                      <CardHeader title="Bills this cycle" subtitle="Scheduled before next paycheck" />
                      {cycle.bills.length === 0 ? (
                        <p className="text-sm text-slate-500">No bills scheduled in this window.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                          {cycle.bills.map((bill) => (
                            <li
                              key={bill.id}
                              className="flex items-center justify-between px-3 py-2.5 text-sm"
                            >
                              <div>
                                <p className="font-medium text-slate-900">{bill.name}</p>
                                <p className="text-xs text-slate-500">
                                  {format(parseISO(bill.date), "MMM d")}
                                  {bill.categoryName ? ` · ${bill.categoryName}` : ""}
                                </p>
                              </div>
                              <span className="font-semibold text-rose-600">
                                {formatCurrency(bill.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <CardHeader
                        title="Allocate to envelopes"
                        subtitle="Suggested from monthly budgets"
                      />
                      {cycle.allocations.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Create envelopes for this month to get allocation suggestions.{" "}
                          <Link href={`/envelopes?month=${cycle.monthKey}`} className="text-indigo-600">
                            Open envelopes
                          </Link>
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {cycle.allocations.map((allocation) => (
                            <div
                              key={allocation.categoryId}
                              className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                            >
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${allocation.color}20` }}
                              >
                                <DynamicIcon
                                  name={allocation.icon}
                                  className="h-4 w-4"
                                  style={{ color: allocation.color }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {allocation.categoryName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {allocation.budgetAmount != null
                                    ? `Budget ${formatCurrency(allocation.budgetAmount)} · Allocated ${formatCurrency(allocation.currentAllocated)}`
                                    : `Allocated ${formatCurrency(allocation.currentAllocated)}`}
                                </p>
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={allocationInputs[cycle.id]?.[allocation.categoryId] ?? ""}
                                onChange={(e) =>
                                  setAllocationInputs((prev) => ({
                                    ...prev,
                                    [cycle.id]: {
                                      ...(prev[cycle.id] ?? {}),
                                      [allocation.categoryId]: e.target.value,
                                    },
                                  }))
                                }
                                className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Fund envelope pool from paycheck
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={poolAmountInputs[cycle.id] ?? ""}
                          onChange={(e) =>
                            setPoolAmountInputs((prev) => ({
                              ...prev,
                              [cycle.id]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:w-48"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Allocations: {formatCurrency(allocationTotal)}
                          {unassignedPool !== 0 && (
                            <> · Pool remainder: {formatCurrency(unassignedPool)}</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/envelopes?month=${cycle.monthKey}`}>
                          <Button type="button" variant="secondary" size="sm">
                            <Wallet className="h-4 w-4" />
                            View envelopes
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          disabled={applyingCycleId === cycle.id || (poolAmount <= 0 && allocationTotal <= 0)}
                          onClick={() => applyCycle(cycle)}
                        >
                          {applyingCycleId === cycle.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4" />
                              Apply plan
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
        <CalendarRange className="h-5 w-5 text-indigo-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pay Cycle Planner</h1>
        <p className="text-sm text-slate-500">
          See bills due before each paycheck and allocate the rest to envelopes
        </p>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "neutral" | "shortfall";
}) {
  const color =
    tone === "income"
      ? "text-emerald-600"
      : tone === "expense"
        ? "text-rose-600"
        : tone === "shortfall"
          ? "text-rose-600"
          : "text-indigo-600";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", color)}>{formatCurrency(value)}</p>
    </div>
  );
}
