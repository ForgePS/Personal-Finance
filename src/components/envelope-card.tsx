"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";
import { ArrowRightLeft, Plus, Minus, ListChecks, Trash2, Target } from "lucide-react";

export interface EnvelopeTransaction {
  id: string;
  description: string;
  merchant: string | null;
  amount: number;
  date: string;
  accountName: string;
  isMatched: boolean;
}

export interface EnvelopeData {
  id: string;
  categoryId: string;
  allocated: number;
  budgetAmount: number | null;
  spent: number;
  remaining: number;
  budgetRemaining: number | null;
  percentUsed: number;
  budgetPercentUsed: number | null;
  isOverspent: boolean;
  isOverBudget: boolean;
  isUnderFunded: boolean;
  transactions: EnvelopeTransaction[];
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export function EnvelopeCard({
  envelope,
  onFund,
  onTransfer,
  onReturn,
  onReconcile,
  onSetBudget,
  onRemove,
}: {
  envelope: EnvelopeData;
  onFund: () => void;
  onTransfer: () => void;
  onReturn: () => void;
  onReconcile: () => void;
  onSetBudget: () => void;
  onRemove: () => void;
}) {
  const hasBudget = envelope.budgetAmount != null;
  const fillPercent = hasBudget
    ? Math.min(envelope.budgetPercentUsed ?? 0, 100)
    : envelope.allocated > 0
      ? Math.min(envelope.percentUsed, 100)
      : 0;
  const fillLabel = hasBudget ? "of budget" : "remaining";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md",
        envelope.isOverspent || envelope.isOverBudget
          ? "border-rose-300"
          : "border-slate-200/80 hover:border-indigo-200"
      )}
    >
      <div
        className="absolute -right-6 -top-6 h-16 w-16 rotate-45 opacity-10"
        style={{ backgroundColor: envelope.category.color }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${envelope.category.color}20` }}
            >
              <DynamicIcon
                name={envelope.category.icon}
                className="h-5 w-5"
                style={{ color: envelope.category.color }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{envelope.category.name}</h3>
              <p className="text-xs text-slate-500">
                {envelope.transactions.length} matched transaction
                {envelope.transactions.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {envelope.isOverBudget && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                Over budget
              </span>
            )}
            {envelope.isOverspent && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                Overspent
              </span>
            )}
            {envelope.isUnderFunded && !envelope.isOverspent && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Under-funded
              </span>
            )}
          </div>
        </div>

        <div className="relative mt-5">
          <div className="h-24 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 transition-all duration-700",
                envelope.isOverBudget || envelope.isOverspent
                  ? "bg-rose-400"
                  : "bg-gradient-to-t opacity-80"
              )}
              style={{
                height: `${fillPercent}%`,
                backgroundColor:
                  envelope.isOverBudget || envelope.isOverspent
                    ? undefined
                    : envelope.category.color,
              }}
            />
            <div className="relative flex h-full flex-col items-center justify-center">
              {hasBudget ? (
                <>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      envelope.isOverBudget ? "text-rose-700" : "text-slate-900"
                    )}
                  >
                    {formatCurrency(envelope.budgetRemaining ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">left in budget</p>
                </>
              ) : (
                <>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      envelope.isOverspent ? "text-rose-700" : "text-slate-900"
                    )}
                  >
                    {formatCurrency(envelope.remaining)}
                  </p>
                  <p className="text-xs text-slate-500">{fillLabel}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="font-medium text-slate-500">Budget</p>
            <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
              {hasBudget ? formatCurrency(envelope.budgetAmount!) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="font-medium text-slate-500">Allocated</p>
            <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
              {formatCurrency(envelope.allocated)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="font-medium text-slate-500">Spent</p>
            <p className="mt-0.5 font-semibold tabular-nums text-rose-600">
              {formatCurrency(envelope.spent)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="font-medium text-slate-500">Cash left</p>
            <p className="mt-0.5 font-semibold tabular-nums text-indigo-600">
              {formatCurrency(envelope.remaining)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:opacity-100">
          <button
            onClick={onSetBudget}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-violet-50 py-2.5 text-xs font-medium text-violet-700 hover:bg-violet-100 touch-manipulation"
          >
            <Target className="h-3.5 w-3.5" />
            Budget
          </button>
          <button
            onClick={onFund}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-indigo-50 py-2.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 touch-manipulation"
          >
            <Plus className="h-3.5 w-3.5" />
            Fund
          </button>
          <button
            onClick={onReconcile}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-emerald-50 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 touch-manipulation"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Reconcile
          </button>
          <button
            onClick={onTransfer}
            disabled={envelope.remaining <= 0}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-slate-50 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 touch-manipulation"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Move
          </button>
          <button
            onClick={onReturn}
            disabled={envelope.remaining <= 0}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-slate-50 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 touch-manipulation"
          >
            <Minus className="h-3.5 w-3.5" />
            Return
          </button>
        </div>

        {envelope.allocated === 0 && (
          <button
            onClick={onRemove}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove envelope
          </button>
        )}
      </div>
    </div>
  );
}
