import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseScheduleInput } from "@/lib/schedule-types";

export async function GET() {
  const expenses = await db.scheduledExpense.findMany({
    orderBy: { name: "asc" },
    include: { category: true, account: true },
  });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = parseScheduleInput(body);
  const expense = await db.scheduledExpense.create({
    data: {
      name: input.name,
      amount: input.amount,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      secondDayOfMonth: input.secondDayOfMonth,
      customIntervalDays: input.customIntervalDays,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      categoryId: input.categoryId,
      accountId: input.accountId,
      color: input.color,
      icon: input.icon,
      notes: input.notes,
      isActive: input.isActive,
    },
    include: { category: true, account: true },
  });
  return NextResponse.json(expense, { status: 201 });
}
