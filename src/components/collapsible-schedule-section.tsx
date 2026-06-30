"use client";

import { useState } from "react";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus } from "lucide-react";

export function CollapsibleScheduleSection({
  title,
  subtitle,
  items,
  amountTone = "income",
  defaultOpen = false,
  emptyMessage,
  onAdd,
  addLabel = "Add",
  children,
}: {
  title: string;
  subtitle: string;
  items: { amount: number }[];
  amountTone?: "income" | "expense";
  defaultOpen?: boolean;
  emptyMessage: string;
  onAdd: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const countLabel = `${items.length} schedule${items.length === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
          <div className="min-w-0">
            <CardHeader title={title} subtitle={subtitle} />
            {!open && items.length > 0 && (
              <p className="mt-1 text-sm text-slate-600">
                {countLabel} ·{" "}
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    amountTone === "income" ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {formatCurrency(totalAmount)}
                </span>
              </p>
            )}
            {!open && items.length === 0 && (
              <p className="mt-1 text-sm text-slate-500">{emptyMessage}</p>
            )}
          </div>
        </button>
        <Button size="sm" onClick={onAdd} className="shrink-0">
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
