import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDashboardData } from "@/lib/services";

export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam ? new Date(monthParam) : undefined;
  const data = await getDashboardData(month);
  return NextResponse.json(data);
}
