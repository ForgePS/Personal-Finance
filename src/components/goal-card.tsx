"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";

interface GoalCardProps {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date | string | null;
  icon: string;
  color: string;
  accountName?: string | null;
  onEdit?: () => void;
}

export function GoalCard({
  name,
  targetAmount,
  currentAmount,
  targetDate,
  icon,
  color,
  accountName,
  onEdit,
}: GoalCardProps) {
  const percent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const remaining = targetAmount - currentAmount;

  return (
    <div
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={onEdit}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit();
              }
            }
          : undefined
      }
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all ${
        onEdit
          ? "cursor-pointer hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}20` }}
          >
            <DynamicIcon name={icon} className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{name}</h3>
            {accountName && (
              <p className="text-xs text-slate-500">Linked to {accountName}</p>
            )}
          </div>
        </div>
        <span className="text-sm font-bold text-indigo-600">
          {Math.round(percent)}%
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatCurrency(currentAmount)}
          </span>
          <span className="text-slate-500 tabular-nums">
            of {formatCurrency(targetAmount)}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{formatCurrency(remaining)} to go</span>
          {targetDate && <span>Target: {formatDate(targetDate)}</span>}
        </div>
      </div>
    </div>
  );
}
