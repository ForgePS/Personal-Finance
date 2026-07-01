import { NextRequest, NextResponse } from "next/server";
import { getPaycheckPlannerData } from "@/lib/paycheck-planner-service";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const data = await getPaycheckPlannerData(accountId);
  return NextResponse.json(data);
});
