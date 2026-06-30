"use client";

import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Landmark } from "lucide-react";

interface TransactionRowProps {
  id: string;
  description: string;
  merchant?: string | null;
  amount: number;
  date: Date | string;
  category?: { name: string; color: string; icon: string } | null;
  account?: { name: string; color: string } | null;
  transferAccount?: { name: string; color: string } | null;
  debtAccount?: { name: string; color: string } | null;
  isTransfer?: boolean;
  onClick?: () => void;
}

export function TransactionRow({
  description,
  merchant,
  amount,
  date,
  category,
  account,
  transferAccount,
  debtAccount,
  isTransfer,
  onClick,
}: TransactionRowProps) {
  const isIncome = !isTransfer && !debtAccount && amount > 0;
  const isTransferOut = isTransfer && amount < 0;
  const isDebtPayment = Boolean(debtAccount) && amount < 0;

  const subtitle = isTransfer && account && transferAccount
    ? `${account.name} → ${transferAccount.name}`
    : isDebtPayment && account && debtAccount
      ? `${category?.name || "Debt payment"} · pays ${debtAccount.name}`
      : [merchant || category?.name || "Uncategorized", account?.name].filter(Boolean).join(" · ");

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
        style={{
          backgroundColor: isTransfer
            ? "#6366f120"
            : isDebtPayment
              ? "#f43f5e20"
              : `${category?.color || "#6366f1"}20`,
        }}
      >
        {isTransfer ? (
          <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
        ) : isDebtPayment ? (
          <Landmark className="h-5 w-5 text-rose-600" />
        ) : (
          <DynamicIcon
            name={category?.icon || "tag"}
            className="h-5 w-5"
            style={{ color: category?.color || "#6366f1" }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{description}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isTransfer
              ? "text-indigo-600"
              : isIncome
                ? "text-emerald-600"
                : "text-slate-900"
          )}
        >
          {isTransfer
            ? formatCurrency(Math.abs(amount))
            : `${isIncome ? "+" : ""}${formatCurrency(amount)}`}
        </p>
        <p className="text-xs text-slate-400">
          {isTransfer ? (isTransferOut ? "Outgoing" : "Incoming") : formatShortDate(date)}
        </p>
      </div>
    </div>
  );
}
