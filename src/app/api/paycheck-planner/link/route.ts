import { NextRequest, NextResponse } from "next/server";
import { linkTransactionToOccurrence } from "@/lib/paycheck-planner-service";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const transactionId = String(body.transactionId ?? "");
  const occurrenceKey =
    body.occurrenceKey === null || body.occurrenceKey === ""
      ? null
      : String(body.occurrenceKey);

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
  }

  const updated = await linkTransactionToOccurrence(transactionId, occurrenceKey);
  return NextResponse.json(updated);
});
