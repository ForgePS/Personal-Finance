import { NextRequest, NextResponse } from "next/server";
import { updateScheduleDateAdjustment } from "@/lib/paycheck-planner-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const status = body.status === "APPROVED" ? "APPROVED" : "REJECTED";

  const result = await updateScheduleDateAdjustment(id, status);
  return NextResponse.json(result);
}
