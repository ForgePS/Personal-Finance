"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { GoalCard } from "@/components/goal-card";
import { GoalsHeader } from "@/components/goals-header";
import { GoalModal, type GoalRecord } from "@/components/modals/goal-modal";

interface GoalsPageClientProps {
  goals: GoalRecord[];
}

export function GoalsPageClient({ goals }: GoalsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPercent = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const goal = goals.find((g) => g.id === editId);
    if (goal) setEditingGoal(goal);
  }, [searchParams, goals]);

  const closeEditor = () => {
    setEditingGoal(null);
    if (searchParams.get("edit")) {
      router.replace("/goals");
    }
  };

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
        <CardHeader title="Your Goals" subtitle="Tap a goal to edit progress, dates, or linked account" />
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
                onEdit={() => setEditingGoal(goal)}
              />
            ))}
          </div>
        )}
      </Card>

      <GoalModal
        isOpen={editingGoal !== null}
        onClose={closeEditor}
        goal={editingGoal}
      />
    </div>
  );
}
