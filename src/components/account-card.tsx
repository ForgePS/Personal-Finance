"use client";

import { formatCurrency } from "@/lib/utils";
import { DynamicIcon } from "./dynamic-icon";
import { isLiability } from "@/lib/constants";
import Link from "next/link";

interface AccountCardProps {
  id: string;
  name: string;
  type: string;
  institution?: string | null;
  balance: number;
  color: string;
  icon: string;
}

export function AccountCard({
  id,
  name,
  type,
  institution,
  balance,
  color,
  icon,
}: AccountCardProps) {
  const liability = isLiability(type);

  return (
    <Link
      href={`/accounts/${id}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <DynamicIcon name={icon} className="h-6 w-6" style={{ color }} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900 group-hover:text-indigo-600">
          {name}
        </p>
        <p className="truncate text-sm text-slate-500">
          {institution || type.replace(/_/g, " ")}
        </p>
      </div>

      <div className="text-right">
        <p
          className={`text-lg font-bold tabular-nums ${
            liability ? "text-rose-600" : "text-slate-900"
          }`}
        >
          {liability ? "-" : ""}
          {formatCurrency(Math.abs(balance))}
        </p>
      </div>
    </Link>
  );
}
