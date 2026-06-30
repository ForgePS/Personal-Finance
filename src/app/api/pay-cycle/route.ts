import { NextRequest, NextResponse } from "next/server";
import { getPayCyclePlannerData } from "@/lib/pay-cycle-service";

export async function GET(request: NextRequest) {
  const scheduleId = request.nextUrl.searchParams.get("scheduleId") ?? undefined;
  const data = await getPayCyclePlannerData(scheduleId || undefined);
  return NextResponse.json(data);
}
