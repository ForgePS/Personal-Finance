import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { GoalCard } from "@/components/goal-card";
import { GoalsHeader } from "@/components/goals-header";

export const metadata: Metadata = {
  title: "Goals | Money Command",
  description: "Track your savings goals and financial targets",
};

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await db.goal.findMany({
    orderBy: { targetDate: "asc" },
    include: { account: true },
  });

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPercent = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-8">
      <GoalsHeader />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Target</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalTarget)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Saved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalSaved)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Overall Progress</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{Math.round(overallPercent)}%</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Your Goals" subtitle="Savings targets and milestones" />
        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No goals yet. Create your first savings goal to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                name={goal.name}
                targetAmount={goal.targetAmount}
                currentAmount={goal.currentAmount}
                targetDate={goal.targetDate}
                icon={goal.icon}
                color={goal.color}
                accountName={goal.account?.name}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
