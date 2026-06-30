"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Mail,
  TrendingDown,
  Unlink,
  Wallet,
  X,
} from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import type { LinkableTransaction, PaycheckPlannerData, PlannerEvent } from "@/lib/paycheck-planner-types";
import { PLANNER_HORIZON_DAYS } from "@/lib/paycheck-planner-types";

interface AccountOption {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface PaycheckPlannerPageClientProps {
  initialData: PaycheckPlannerData;
  accounts: AccountOption[];
}

function priorityLabel(priority: number) {
  if (priority <= 20) return "Essential";
  if (priority <= 40) return "High";
  if (priority <= 60) return "Normal";
  if (priority <= 80) return "Low";
  return "Optional";
}

function eventKindLabel(event: PlannerEvent) {
  if (event.kind === "balance") return "Starting balance";
  if (event.kind === "transaction") return "Transaction";
  return event.type === "income" ? "Scheduled income" : "Scheduled expense";
}

export function PaycheckPlannerPageClient({
  initialData,
  accounts,
}: PaycheckPlannerPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [prioritiesOpen, setPrioritiesOpen] = useState(false);
  const [linkingOpen, setLinkingOpen] = useState(true);
  const [rescheduleEvent, setRescheduleEvent] = useState<PlannerEvent | null>(null);
  const [newDate, setNewDate] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    setData(initialData);
    const defaults: Record<string, string> = {};
    for (const tx of initialData.linkableTransactions) {
      defaults[tx.id] = tx.suggestedOccurrenceKey ?? "";
    }
    setLinkSelections(defaults);
  }, [initialData]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const checkingAccounts = useMemo(
    () => accounts.filter((a) => a.type === "CHECKING" || a.type === "CASH"),
    [accounts]
  );

  const accountOptions = useMemo(
    () => [
      ...checkingAccounts.map((a) => ({
        value: a.id,
        label: `${a.name} (${formatCurrency(a.balance)})`,
      })),
      ...accounts
        .filter((a) => a.type !== "CHECKING" && a.type !== "CASH")
        .map((a) => ({
          value: a.id,
          label: `${a.name} (${formatCurrency(a.balance)})`,
        })),
    ],
    [accounts, checkingAccounts]
  );

  const occurrenceOptions = useMemo(
    () =>
      data.linkTargets.map((target) => ({
        value: target.occurrenceKey,
        label: `${target.name} · ${formatShortDate(target.date)} · ${formatCurrency(target.amount)}`,
      })),
    [data.linkTargets]
  );

  const refresh = (accountId?: string | null) => {
    startTransition(() => {
      const query = accountId ? `?accountId=${accountId}` : "";
      router.push(`/paycheck-planner${query}`);
      router.refresh();
    });
  };

  const handleAccountChange = (accountId: string) => {
    refresh(accountId);
  };

  const handlePriorityChange = async (scheduleId: string, priority: number) => {
    setActionLoading(`priority-${scheduleId}`);
    try {
      await fetch("/api/paycheck-planner/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_priority", scheduleId, priority }),
      });
      refresh(data.accountId);
    } finally {
      setActionLoading(null);
    }
  };

  const openReschedule = (event: PlannerEvent) => {
    setRescheduleEvent(event);
    setNewDate(event.adjustment?.adjustedDate ?? event.effectiveDate);
  };

  const submitReschedule = async () => {
    if (!rescheduleEvent?.occurrenceKey || !newDate) return;
    setActionLoading("reschedule");
    try {
      await fetch("/api/paycheck-planner/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: rescheduleEvent.type === "income" ? "INCOME" : "EXPENSE",
          scheduleId: rescheduleEvent.scheduleId,
          occurrenceKey: rescheduleEvent.occurrenceKey,
          originalDate: rescheduleEvent.originalDate,
          adjustedDate: newDate,
        }),
      });
      setRescheduleEvent(null);
      refresh(data.accountId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjustmentAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(id);
    try {
      await fetch(`/api/paycheck-planner/adjustments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      refresh(data.accountId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLinkTransaction = async (tx: LinkableTransaction) => {
    const occurrenceKey = linkSelections[tx.id] || null;
    setActionLoading(`link-${tx.id}`);
    try {
      await fetch("/api/paycheck-planner/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: tx.id,
          occurrenceKey: occurrenceKey || null,
        }),
      });
      refresh(data.accountId);
    } finally {
      setActionLoading(null);
    }
  };

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, PlannerEvent[]> = {};
    for (const event of data.events) {
      if (!grouped[event.effectiveDate]) grouped[event.effectiveDate] = [];
      grouped[event.effectiveDate].push(event);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [data.events]);

  const sortedPriorities = useMemo(
    () => [...data.expensePriorities].sort((a, b) => a.priority - b.priority),
    [data.expensePriorities]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Paycheck Planner</h1>
              <p className="text-sm text-slate-500">
                Starts from your current balance, then projects {PLANNER_HORIZON_DAYS} days forward
              </p>
            </div>
          </div>
        </div>
        <div className="w-full sm:w-72">
          <Select
            label="Planning account"
            value={data.accountId ?? ""}
            onChange={(e) => handleAccountChange(e.target.value)}
            options={accountOptions}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current balance"
          value={formatCurrency(data.summary.startingBalance)}
          icon={<Wallet className="h-5 w-5" />}
          accent="indigo"
        />
        <StatCard
          label="Projected ending"
          value={formatCurrency(data.summary.endingBalance)}
          change={
            data.summary.endingBalance >= data.summary.startingBalance
              ? `+${formatCurrency(data.summary.endingBalance - data.summary.startingBalance)}`
              : formatCurrency(data.summary.endingBalance - data.summary.startingBalance)
          }
          changeLabel="from today"
          icon={<TrendingDown className="h-5 w-5" />}
          accent={data.summary.endingBalance >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Lowest balance"
          value={formatCurrency(data.summary.lowestBalance)}
          change={
            data.summary.lowestBalanceDate
              ? formatShortDate(data.summary.lowestBalanceDate)
              : undefined
          }
          changeLabel="on this date"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={data.summary.lowestBalance < 0 ? "red" : "amber"}
        />
        <StatCard
          label="Scheduled net"
          value={formatCurrency(data.summary.totalIncome - data.summary.totalExpenses)}
          change={`${formatCurrency(data.summary.totalIncome)} in · ${formatCurrency(data.summary.totalExpenses)} out`}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="purple"
        />
      </div>

      {data.envelopeSummary && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Envelope pool this month</p>
                <p className="text-violet-800/80">
                  {formatCurrency(data.envelopeSummary.totalAllocated)} allocated ·{" "}
                  {formatCurrency(data.envelopeSummary.unallocated)} unallocated ·{" "}
                  {formatCurrency(data.envelopeSummary.totalSpent)} spent
                </p>
              </div>
            </div>
            <Link
              href="/envelopes"
              className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline"
            >
              Manage envelopes
            </Link>
          </div>
        </div>
      )}

      {(data.summary.shortfallCount > 0 ||
        data.summary.pendingAdjustmentCount > 0 ||
        data.summary.envelopeShortfallCount > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.summary.shortfallCount > 0 && (
            <p>
              <strong>{data.summary.shortfallCount}</strong> item
              {data.summary.shortfallCount === 1 ? "" : "s"} may overdraw the account.
            </p>
          )}
          {data.summary.envelopeShortfallCount > 0 && (
            <p className={data.summary.shortfallCount > 0 ? "mt-1" : ""}>
              <strong>{data.summary.envelopeShortfallCount}</strong> scheduled expense
              {data.summary.envelopeShortfallCount === 1 ? "" : "s"} exceed
              {data.summary.envelopeShortfallCount === 1 ? "s" : ""} the envelope balance.
            </p>
          )}
          {data.summary.pendingAdjustmentCount > 0 && (
            <p className={data.summary.shortfallCount > 0 || data.summary.envelopeShortfallCount > 0 ? "mt-1" : ""}>
              <strong>{data.summary.pendingAdjustmentCount}</strong> date change
              {data.summary.pendingAdjustmentCount === 1 ? " is" : "s are"} waiting for approval.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" padding>
          <CardHeader
            title="Cash flow timeline"
            subtitle={`Begins at ${formatCurrency(data.startingBalance)} today, then projects forward`}
            action={
              isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : null
            }
          />

          {eventsByDate.length <= 1 && data.events.length <= 1 ? (
            <p className="text-sm text-slate-500">
              No upcoming paychecks or scheduled expenses in the next {PLANNER_HORIZON_DAYS} days.
              Your projection starts from the current balance shown above.
            </p>
          ) : (
            <div className="space-y-6">
              {eventsByDate.map(([date, events]) => (
                <div key={date}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatShortDate(date)}
                    </p>
                  </div>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded-xl border p-3",
                          event.kind === "balance"
                            ? "border-indigo-200 bg-indigo-50/70"
                            : event.status === "shortfall"
                              ? "border-rose-200 bg-rose-50/60"
                              : event.status === "envelope_shortfall"
                                ? "border-violet-200 bg-violet-50/60"
                                : event.status === "pending_move"
                                  ? "border-amber-200 bg-amber-50/60"
                                  : "border-slate-200 bg-slate-50/50"
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: event.color }}
                              />
                              <p className="truncate font-medium text-slate-900">{event.name}</p>
                              {event.type === "expense" && event.kind === "scheduled" && (
                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                                  P{event.priority} · {priorityLabel(event.priority)}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                {event.kind === "balance" ? (
                                  <Wallet className="h-3.5 w-3.5 text-indigo-600" />
                                ) : event.type === "income" ? (
                                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                                )}
                                {eventKindLabel(event)}
                              </span>
                              {event.categoryName && <span>{event.categoryName}</span>}
                              {event.envelopeRemaining != null && event.type === "expense" && (
                                <span>
                                  Envelope left: {formatCurrency(event.envelopeRemaining)}
                                </span>
                              )}
                              {event.originalDate !== event.effectiveDate && (
                                <span>Moved from {formatShortDate(event.originalDate)}</span>
                              )}
                            </div>
                            {event.adjustment?.status === "PENDING" && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-amber-800">
                                  Proposed move to {formatShortDate(event.adjustment.adjustedDate)}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    handleAdjustmentAction(event.adjustment!.id, "APPROVED")
                                  }
                                  disabled={actionLoading === event.adjustment.id}
                                  className="h-7 gap-1 px-2 text-xs"
                                >
                                  {actionLoading === event.adjustment.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    handleAdjustmentAction(event.adjustment!.id, "REJECTED")
                                  }
                                  disabled={actionLoading === event.adjustment.id}
                                  className="h-7 gap-1 px-2 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-start gap-3 sm:text-right">
                            <div>
                              {event.kind === "balance" ? (
                                <p className="font-semibold text-indigo-700">
                                  {formatCurrency(event.balanceAfter)}
                                </p>
                              ) : (
                                <p
                                  className={cn(
                                    "font-semibold",
                                    event.type === "income" ? "text-emerald-600" : "text-rose-600"
                                  )}
                                >
                                  {event.type === "income" ? "+" : "-"}
                                  {formatCurrency(event.amount)}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                Balance after: {formatCurrency(event.balanceAfter)}
                              </p>
                            </div>
                            {event.kind === "scheduled" && event.occurrenceKey && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => openReschedule(event)}
                                className="h-8 whitespace-nowrap text-xs"
                              >
                                Reschedule
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.fulfilledEvents.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Matched to transactions ({data.fulfilledEvents.length})
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                These scheduled items are already covered by linked transactions and are excluded
                from the forward projection.
              </p>
              <div className="mt-3 space-y-2">
                {data.fulfilledEvents.map((event) => (
                  <div
                    key={`fulfilled-${event.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{event.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatShortDate(event.effectiveDate)} · linked to transaction
                      </p>
                    </div>
                    <span className="text-slate-500">{formatCurrency(event.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card padding>
            <button
              type="button"
              onClick={() => setLinkingOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <CardHeader
                title="Link transactions"
                subtitle="Connect real transactions to scheduled items"
              />
              {linkingOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {linkingOpen && (
              <div className="mt-2 space-y-3">
                {data.linkableTransactions.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent transactions to link.</p>
                ) : (
                  data.linkableTransactions.slice(0, 8).map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {tx.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatShortDate(tx.date)}
                            {tx.categoryName ? ` · ${tx.categoryName}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-medium",
                            tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-2">
                        <Select
                          value={linkSelections[tx.id] ?? ""}
                          onChange={(e) =>
                            setLinkSelections((prev) => ({ ...prev, [tx.id]: e.target.value }))
                          }
                          options={[
                            { value: "", label: "No link" },
                            ...occurrenceOptions,
                          ]}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleLinkTransaction(tx)}
                          disabled={actionLoading === `link-${tx.id}`}
                          className="h-8 gap-1.5 text-xs"
                        >
                          {actionLoading === `link-${tx.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : linkSelections[tx.id] ? (
                            <Link2 className="h-3.5 w-3.5" />
                          ) : (
                            <Unlink className="h-3.5 w-3.5" />
                          )}
                          {linkSelections[tx.id] ? "Link to schedule" : "Clear link"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          <Card padding>
            <button
              type="button"
              onClick={() => setPrioritiesOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <CardHeader
                title="Expense priorities"
                subtitle="Lower numbers are paid first when cash is tight"
              />
              {prioritiesOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {prioritiesOpen && (
              <div className="mt-2 space-y-3">
                {sortedPriorities.length === 0 ? (
                  <p className="text-sm text-slate-500">No scheduled expenses yet.</p>
                ) : (
                  sortedPriorities.map((expense) => (
                    <div
                      key={expense.scheduleId}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={expense.priority}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setData((prev) => ({
                            ...prev,
                            expensePriorities: prev.expensePriorities.map((p) =>
                              p.scheduleId === expense.scheduleId
                                ? { ...p, priority: value }
                                : p
                            ),
                          }));
                        }}
                        onBlur={(e) =>
                          handlePriorityChange(expense.scheduleId, Number(e.target.value))
                        }
                        className="w-16 py-1.5 text-center"
                        aria-label={`Priority for ${expense.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {expense.name}
                        </p>
                        <p className="text-xs text-slate-500">{priorityLabel(expense.priority)}</p>
                      </div>
                      {actionLoading === `priority-${expense.scheduleId}` && (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={Boolean(rescheduleEvent)}
        onClose={() => setRescheduleEvent(null)}
        title="Reschedule payment"
      >
        {rescheduleEvent && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Move <strong>{rescheduleEvent.name}</strong> from{" "}
              {formatShortDate(rescheduleEvent.originalDate)}. The change will be applied to your
              plan after you approve it.
            </p>
            <Input
              label="New date"
              type="date"
              value={newDate}
              min={data.rangeStart}
              max={data.rangeEnd}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setRescheduleEvent(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitReschedule}
                disabled={actionLoading === "reschedule" || newDate === rescheduleEvent.originalDate}
              >
                {actionLoading === "reschedule" ? "Saving..." : "Propose date change"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
