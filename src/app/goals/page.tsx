import type { Metadata } from "next";
import { Suspense } from "react";
import { withServerAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { GoalsPageClient } from "@/components/goals-page-client";
import { toIsoString } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Goals | Money Command",
  description: "Track your savings goals and financial targets",
};

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  return withServerAuth(async () => {
    const goals = await db.goal.findMany({
      orderBy: { targetDate: "asc" },
      include: { account: true },
    });

    return (
      <Suspense fallback={<div className="p-8 text-slate-500">Loading goals...</div>}>
        <GoalsPageClient
          goals={goals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            targetDate: toIsoString(goal.targetDate),
            icon: goal.icon,
            color: goal.color,
            accountId: goal.accountId,
            account: goal.account ? { name: goal.account.name } : null,
          }))}
        />
      </Suspense>
    );
  });
}
