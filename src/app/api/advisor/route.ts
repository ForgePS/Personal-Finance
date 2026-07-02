import { NextResponse } from "next/server";
import { getFinancialAdvisorData } from "@/lib/financial-advisor-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFinancialAdvisorData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Advisor API error:", error);
    return NextResponse.json(
      { error: "Failed to generate financial advisor data" },
      { status: 500 }
    );
  }
}
