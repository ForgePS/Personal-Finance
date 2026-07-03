import { NextRequest, NextResponse } from "next/server";
import {
  createScheduleDateAdjustment,
  updateExpensePriority,
} from "@/lib/paycheck-planner-service";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();

  if (body.action === "update_priority") {
    const scheduleId = String(body.scheduleId ?? "");
    const priority = Number(body.priority);
    if (!scheduleId || Number.isNaN(priority)) {
      return NextResponse.json({ error: "scheduleId and priority are required" }, { status: 400 });
    }
    const updated = await updateExpensePriority(scheduleId, priority);
    return NextResponse.json(updated);
  }

  const sourceType = body.sourceType === "INCOME" ? "INCOME" : "EXPENSE";
  const scheduleId = String(body.scheduleId ?? "");
  const occurrenceKey = String(body.occurrenceKey ?? "");
  const originalDate = String(body.originalDate ?? "");
  const adjustedDate = String(body.adjustedDate ?? "");

  if (!scheduleId || !occurrenceKey || !originalDate || !adjustedDate) {
    return NextResponse.json(
      { error: "scheduleId, occurrenceKey, originalDate, and adjustedDate are required" },
      { status: 400 }
    );
  }

  if (originalDate === adjustedDate) {
    return NextResponse.json({ error: "Choose a different date" }, { status: 400 });
  }

  const adjustment = await createScheduleDateAdjustment({
    sourceType,
    scheduleId,
    occurrenceKey,
    originalDate,
    adjustedDate,
    notes: body.notes != null ? String(body.notes) : null,
  });

  return NextResponse.json(adjustment, { status: 201 });
});
