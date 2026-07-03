import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/analytics-service";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const data = await getAnalyticsData(accountId === "all" ? null : accountId);
  return NextResponse.json(data);
});
