import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBudgetData } from "@/lib/services";
import { startOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam ? startOfMonth(new Date(monthParam)) : undefined;
  const budgets = await getBudgetData(month);
  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const month = startOfMonth(new Date(body.month));

  const budget = await db.budget.upsert({
    where: {
      categoryId_month: {
        categoryId: body.categoryId,
        month,
      },
    },
    update: { amount: parseFloat(body.amount) },
    create: {
      categoryId: body.categoryId,
      amount: parseFloat(body.amount),
      month,
    },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
