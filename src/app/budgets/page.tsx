import type { Metadata } from "next";
import { getBudgetData } from "@/lib/services";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { BudgetBar } from "@/components/budget-bar";
import { BudgetsHeader } from "@/components/budgets-header";

export const metadata: Metadata = {
  title: "Budgets | Money Command",
  description: "Track your monthly spending budgets",
};

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const budgets = await getBudgetData();

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgets.filter((b) => b.isOver).length;

  return (
    <div className="space-y-8">
      <BudgetsHeader />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Budgeted</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalBudgeted)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{formatCurrency(totalSpent)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Remaining</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              totalBudgeted - totalSpent >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(totalBudgeted - totalSpent)}
          </p>
        </Card>
      </div>

      {overBudgetCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {overBudgetCount} {overBudgetCount === 1 ? "category is" : "categories are"} over budget
          this month. Review your spending to get back on track.
        </div>
      )}

      <Card>
        <CardHeader
          title="Category Budgets"
          subtitle={`${formatMonthYear(new Date())} spending limits`}
        />
        <div className="space-y-6">
          {budgets.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No budgets set for this month. Add budgets to start tracking.
            </p>
          ) : (
            budgets.map((budget) => (
              <BudgetBar
                key={budget.id}
                categoryName={budget.category.name}
                categoryIcon={budget.category.icon}
                categoryColor={budget.category.color}
                budgeted={budget.amount}
                spent={budget.spent}
                percent={budget.percent}
                isOver={budget.isOver}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
