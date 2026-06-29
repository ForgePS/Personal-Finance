import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const goals = await db.goal.findMany({
    orderBy: { targetDate: "asc" },
    include: { account: true },
  });
  return NextResponse.json(goals);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const goal = await db.goal.create({
    data: {
      name: body.name,
      targetAmount: parseFloat(body.targetAmount),
      currentAmount: parseFloat(body.currentAmount) || 0,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      icon: body.icon || "target",
      color: body.color || "#10b981",
      accountId: body.accountId || null,
    },
    include: { account: true },
  });
  return NextResponse.json(goal, { status: 201 });
}
