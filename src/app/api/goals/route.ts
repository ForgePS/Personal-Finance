import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { withTenantData } from "@/lib/tenant-where";

export const GET = withAuth(async () => {
  const goals = await db.goal.findMany({
    orderBy: { targetDate: "asc" },
    include: { account: true },
  });
  return NextResponse.json(goals);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const goal = await db.goal.create({
    data: withTenantData({
      name: body.name,
      targetAmount: parseFloat(body.targetAmount),
      currentAmount: parseFloat(body.currentAmount) || 0,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      icon: body.icon || "target",
      color: body.color || "#10b981",
      accountId: body.accountId || null,
    }),
    include: { account: true },
  });
  return NextResponse.json(goal, { status: 201 });
});
