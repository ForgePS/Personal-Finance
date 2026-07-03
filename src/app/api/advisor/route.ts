import { NextResponse } from "next/server";
import { getFinancialAdvisorData } from "@/lib/financial-advisor-service";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async () => {
  const data = await getFinancialAdvisorData();
  return NextResponse.json(data);
});
