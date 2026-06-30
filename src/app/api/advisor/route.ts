import { NextResponse } from "next/server";
import { getFinancialAdvisorData } from "@/lib/financial-advisor-service";

export async function GET() {
  const data = await getFinancialAdvisorData();
  return NextResponse.json(data);
}
