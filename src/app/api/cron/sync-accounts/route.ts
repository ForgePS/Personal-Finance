import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncAllPlaidItems } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ error: "Plaid is not configured", synced: [] }, { status: 503 });
  }

  const startedAt = new Date().toISOString();
  const results = await syncAllPlaidItems();
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    startedAt,
    finishedAt: new Date().toISOString(),
    total: results.length,
    succeeded: results.length - failed.length,
    failed: failed.length,
    results,
  });
}
