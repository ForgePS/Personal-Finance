import { NextRequest, NextResponse } from "next/server";
import {
  syncPlaidItem,
  getConnectedBanks,
  sanitizePlaidItemForClient,
} from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";
import { parsePlaidError } from "@/lib/plaid-errors";

function buildSyncMessage(result: Awaited<ReturnType<typeof syncPlaidItem>>) {
  const parts: string[] = [];

  if (result.balancesUpdated > 0) {
    parts.push(
      `Updated ${result.balancesUpdated} account balance${result.balancesUpdated === 1 ? "" : "s"}`
    );
  }

  if (result.newTransactions > 0) {
    parts.push(
      `Imported ${result.newTransactions} new transaction${result.newTransactions === 1 ? "" : "s"}`
    );
  } else if (result.updatedTransactions > 0) {
    parts.push(
      `Refreshed ${result.updatedTransactions} existing transaction${result.updatedTransactions === 1 ? "" : "s"}`
    );
  } else if (result.initialSync) {
    parts.push(
      "Balances synced. Transactions may take a few minutes on first connect — tap Sync again shortly."
    );
  } else {
    parts.push("Already up to date — no new transactions since last sync");
  }

  return parts.join(". ");
}

export async function GET() {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ configured: false, items: [] });
  }

  const items = await getConnectedBanks();
  return NextResponse.json({
    configured: true,
    items: items.map(sanitizePlaidItemForClient),
  });
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({
      ...result,
      message: buildSyncMessage(result),
    });
  } catch (error) {
    console.error("Plaid sync error:", error);
    const message = parsePlaidError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
