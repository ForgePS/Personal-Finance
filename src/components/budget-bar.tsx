"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";

interface BudgetBarProps {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgeted: number;
  spent: number;
  percent: number;
  isOver: boolean;
}

export function BudgetBar({
  categoryName,
  categoryIcon,
  categoryColor,
  budgeted,
  spent,
  percent,
  isOver,
}: BudgetBarProps) {
  const displayPercent = Math.min(percent, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${categoryColor}20` }}
          >
            <DynamicIcon
              name={categoryIcon}
              className="h-4 w-4"
              style={{ color: categoryColor }}
            />
          </div>
          <span className="text-sm font-medium text-slate-900">{categoryName}</span>
        </div>
        <div className="text-right text-sm">
          <span className={cn("font-semibold tabular-nums", isOver ? "text-rose-600" : "text-slate-900")}>
            {formatCurrency(spent)}
          </span>
          <span className="text-slate-400"> / {formatCurrency(budgeted)}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOver ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-rose-600">
          Over budget by {formatCurrency(spent - budgeted)}
        </p>
      )}
    </div>
  );
}
