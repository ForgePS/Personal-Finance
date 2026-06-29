"use client";

import { formatCurrency } from "@/lib/utils";
import { Wallet, PiggyBank, AlertCircle } from "lucide-react";

interface EnvelopePoolBannerProps {
  totalFunds: number;
  totalAllocated: number;
  totalSpent: number;
  unallocated: number;
  onEditPool: () => void;
}

export function EnvelopePoolBanner({
  totalFunds,
  totalAllocated,
  totalSpent,
  unallocated,
  onEditPool,
}: EnvelopePoolBannerProps) {
  const allocatedPercent = totalFunds > 0 ? (totalAllocated / totalFunds) * 100 : 0;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ready to Assign</h2>
            <p className="text-sm text-slate-500">Your monthly money pool for envelopes</p>
          </div>
        </div>
        <button
          onClick={onEditPool}
          className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Edit Pool Amount
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Total Pool</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalFunds)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">In Envelopes</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600 tabular-nums">
            {formatCurrency(totalAllocated)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Unallocated</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">
            {formatCurrency(unallocated)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-rose-600 tabular-nums">
            {formatCurrency(totalSpent)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <PiggyBank className="h-3.5 w-3.5" />
            {Math.round(allocatedPercent)}% assigned to envelopes
          </span>
          {unallocated < 0 && (
            <span className="flex items-center gap-1 text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Over-allocated by {formatCurrency(Math.abs(unallocated))}
            </span>
          )}
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(allocatedPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
