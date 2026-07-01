import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseScheduleInput } from "@/lib/schedule-types";
import { withAuth } from "@/lib/api-auth";
import { withTenantData } from "@/lib/tenant-where";

export const GET = withAuth(async () => {
  const schedules = await db.paySchedule.findMany({
    orderBy: { name: "asc" },
    include: { category: true, account: true },
  });
  return NextResponse.json(schedules);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const input = parseScheduleInput(body);
  const schedule = await db.paySchedule.create({
    data: withTenantData({
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
    }),
    include: { category: true, account: true },
  });
  return NextResponse.json(schedule, { status: 201 });
});
