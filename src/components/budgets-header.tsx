"use client";

import { formatMonthYear } from "@/lib/utils";

export function BudgetsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Budgets</h1>
        <p className="text-sm text-slate-500">
          {formatMonthYear(new Date())} spending plan
        </p>
      </div>
    </div>
  );
}
