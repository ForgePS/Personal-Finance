import { NextRequest, NextResponse } from "next/server";
import { autoCategorizeUncategorized } from "@/lib/auto-categorize-service";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  let body: { ids?: string[]; limit?: number } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — categorize recent uncategorized transactions
  }

  const result = await autoCategorizeUncategorized({
    transactionIds: Array.isArray(body.ids) ? body.ids : undefined,
    limit: typeof body.limit === "number" ? body.limit : 500,
  });

  return NextResponse.json(result);
});
