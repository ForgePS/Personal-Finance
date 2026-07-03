import { NextRequest, NextResponse } from "next/server";
import { getEnvelopeData, updateEnvelopePool } from "@/lib/envelope-service";
import { getMonthKey, parseEnvelopeMonthInput } from "@/lib/utils";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam ? parseEnvelopeMonthInput(monthParam) : undefined;
  const data = await getEnvelopeData(month);
  return NextResponse.json(data);
});

export const PATCH = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const month = parseEnvelopeMonthInput(body.month ?? getMonthKey(new Date()));
  const totalFunds = parseFloat(body.totalFunds);

  if (isNaN(totalFunds) || totalFunds < 0) {
    return NextResponse.json({ error: "Invalid total funds amount" }, { status: 400 });
  }

  await updateEnvelopePool(month, totalFunds);
  const data = await getEnvelopeData(month);
  return NextResponse.json(data);
});
