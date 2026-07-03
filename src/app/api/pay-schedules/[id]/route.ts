import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuthContext } from "@/lib/api-auth";
import { parseScheduleInput } from "@/lib/schedule-types";

export const PATCH = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json();
  const input = parseScheduleInput(body);
  const schedule = await db.paySchedule.update({
    where: { id },
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
  return NextResponse.json(schedule);
});

export const DELETE = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.paySchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
