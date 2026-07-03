import { NextRequest, NextResponse } from "next/server";
import {
  enrichSuggestionWithName,
  suggestCategoryFromHistory,
} from "@/lib/auto-categorize-service";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const description = params.get("description")?.trim() ?? "";
  const merchant = params.get("merchant");
  const amount = parseFloat(params.get("amount") ?? "0");

  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (!amount || Number.isNaN(amount)) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const suggestion = await suggestCategoryFromHistory({
    description,
    merchant,
    amount,
  });

  if (!suggestion) {
    return NextResponse.json({ categoryId: null });
  }

  const enriched = await enrichSuggestionWithName(suggestion);
  return NextResponse.json(enriched);
});
