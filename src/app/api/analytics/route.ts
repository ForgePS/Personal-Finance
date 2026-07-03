import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/analytics-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const data = await getAnalyticsData(accountId === "all" ? null : accountId);
  return NextResponse.json(data);
}
