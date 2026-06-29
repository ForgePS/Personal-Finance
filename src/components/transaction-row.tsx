"use client";

import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  id: string;
  description: string;
  merchant?: string | null;
  amount: number;
  date: Date | string;
  category?: { name: string; color: string; icon: string } | null;
  account?: { name: string; color: string } | null;
  onClick?: () => void;
}

export function TransactionRow({
  description,
  merchant,
  amount,
  date,
  category,
  account,
  onClick,
}: TransactionRowProps) {
  const isIncome = amount > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-xl px-3 py-3 transition-colors",
        onClick && "cursor-pointer hover:bg-slate-50"
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${category?.color || "#6366f1"}20` }}
      >
        <DynamicIcon
          name={category?.icon || "tag"}
          className="h-5 w-5"
          style={{ color: category?.color || "#6366f1" }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{description}</p>
        <p className="truncate text-xs text-slate-500">
          {merchant || category?.name || "Uncategorized"}
          {account && ` · ${account.name}`}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isIncome ? "text-emerald-600" : "text-slate-900"
          )}
        >
          {isIncome ? "+" : ""}
          {formatCurrency(amount)}
        </p>
        <p className="text-xs text-slate-400">{formatShortDate(date)}</p>
      </div>
    </div>
  );
}
