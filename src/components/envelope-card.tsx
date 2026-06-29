"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";
import { ArrowRightLeft, Plus, Minus, ListChecks, Trash2 } from "lucide-react";

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
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverspent: boolean;
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
  onRemove,
}: {
  envelope: EnvelopeData;
  onFund: () => void;
  onTransfer: () => void;
  onReturn: () => void;
  onReconcile: () => void;
  onRemove: () => void;
}) {
  const fillPercent =
    envelope.allocated > 0 ? Math.min((envelope.spent / envelope.allocated) * 100, 100) : 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md",
        envelope.isOverspent ? "border-rose-300" : "border-slate-200/80 hover:border-indigo-200"
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
          {envelope.isOverspent && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
              Overspent
            </span>
          )}
        </div>

        <div className="relative mt-5">
          <div className="h-24 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 transition-all duration-700",
                envelope.isOverspent ? "bg-rose-400" : "bg-gradient-to-t opacity-80"
              )}
              style={{
                height: `${fillPercent}%`,
                backgroundColor: envelope.isOverspent ? undefined : envelope.category.color,
              }}
            />
            <div className="relative flex h-full flex-col items-center justify-center">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  envelope.isOverspent ? "text-rose-700" : "text-slate-900"
                )}
              >
                {formatCurrency(envelope.remaining)}
              </p>
              <p className="text-xs text-slate-500">remaining</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
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
            <p className="font-medium text-slate-500">Used</p>
            <p className="mt-0.5 font-semibold tabular-nums text-indigo-600">
              {Math.round(envelope.percentUsed)}%
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:opacity-100">
          <button
            onClick={onFund}
            className="flex items-center justify-center gap-1 rounded-lg bg-indigo-50 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Fund
          </button>
          <button
            onClick={onReconcile}
            className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Reconcile
          </button>
          <button
            onClick={onTransfer}
            disabled={envelope.remaining <= 0}
            className="flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Move
          </button>
          <button
            onClick={onReturn}
            disabled={envelope.remaining <= 0}
            className="flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
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
