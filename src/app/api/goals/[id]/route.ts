import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuthContext } from "@/lib/api-auth";

export const PATCH = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json();

  const goal = await db.goal.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.targetAmount !== undefined && { targetAmount: parseFloat(body.targetAmount) }),
      ...(body.currentAmount !== undefined && { currentAmount: parseFloat(body.currentAmount) }),
      ...(body.targetDate !== undefined && {
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
      }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.accountId !== undefined && { accountId: body.accountId || null }),
    },
    include: { account: true },
  });

  return NextResponse.json(goal);
});

export const DELETE = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
