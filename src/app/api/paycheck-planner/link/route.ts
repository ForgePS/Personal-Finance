import { NextRequest, NextResponse } from "next/server";
import { linkTransactionToOccurrence } from "@/lib/paycheck-planner-service";

export async function POST(request: NextRequest) {
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
}
