import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDashboardData } from "@/lib/services";
import { resolveDashboardAccountId } from "@/lib/dashboard-accounts";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const monthParam = request.nextUrl.searchParams.get("month");
  const accountIdParam = request.nextUrl.searchParams.get("accountId");
  const month = monthParam ? new Date(monthParam) : undefined;

  const accounts = await db.account.findMany({
    where: { isArchived: false },
    select: { id: true, name: true },
  });
  const accountId = resolveDashboardAccountId(accounts, accountIdParam);

  const data = await getDashboardData(month, accountId);
  return NextResponse.json(data);
});
