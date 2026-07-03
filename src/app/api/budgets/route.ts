import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBudgetData } from "@/lib/services";
import { startOfMonth } from "date-fns";
import { withAuth } from "@/lib/api-auth";
import { budgetUniqueWhere, withTenantData } from "@/lib/tenant-where";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam ? startOfMonth(new Date(monthParam)) : undefined;
  const budgets = await getBudgetData(month);
  return NextResponse.json(budgets);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const month = startOfMonth(new Date(body.month));

  const budget = await db.budget.upsert({
    where: budgetUniqueWhere(body.categoryId, month),
    update: { amount: parseFloat(body.amount) },
    create: withTenantData({
      categoryId: body.categoryId,
      amount: parseFloat(body.amount),
      month,
    }),
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
});
