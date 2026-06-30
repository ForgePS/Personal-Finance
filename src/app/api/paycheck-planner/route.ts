import { NextRequest, NextResponse } from "next/server";
import { getPaycheckPlannerData } from "@/lib/paycheck-planner-service";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const data = await getPaycheckPlannerData(accountId);
  return NextResponse.json(data);
}
