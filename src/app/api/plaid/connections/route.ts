import { NextRequest, NextResponse } from "next/server";
import { syncPlaidItem, getConnectedBanks } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async () => {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ configured: false, items: [] });
  }

  const items = await getConnectedBanks();
  return NextResponse.json({ configured: true, items });
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { itemId } = body;

  if (!itemId) {
    return NextResponse.json({ error: "Item ID required" }, { status: 400 });
  }

  try {
    const result = await syncPlaidItem(itemId);
    return NextResponse.json({ ...result, message: "Sync complete" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
