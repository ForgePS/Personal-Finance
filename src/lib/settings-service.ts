import { db } from "@/lib/db";

export async function getSettingsData() {
  const [categories, accounts, goals, paySchedules, scheduledExpenses] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      include: { children: true },
    }),
    db.account.findMany({ orderBy: { name: "asc" } }),
    db.goal.findMany({
      orderBy: { name: "asc" },
      include: { account: true },
    }),
    db.paySchedule.findMany({
      orderBy: { name: "asc" },
      include: { category: true, account: true },
    }),
    db.scheduledExpense.findMany({
      orderBy: { name: "asc" },
      include: { category: true, account: true },
    }),
  ]);

  return { categories, accounts, goals, paySchedules, scheduledExpenses };
}
