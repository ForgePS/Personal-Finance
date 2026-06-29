import { NextRequest, NextResponse } from "next/server";
import { syncPlaidItem, getConnectedBanks } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";

export async function GET() {
  if (!isPlaidConfigured()) {
    return NextResponse.json({ configured: false, items: [] });
  }

  const items = await getConnectedBanks();
  return NextResponse.json({ configured: true, items });
}

export async function POST(request: NextRequest) {
  if (!isPlaidConfigured()) {
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
}
