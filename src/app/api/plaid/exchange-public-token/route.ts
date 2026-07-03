import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlaidClient, isPlaidConfigured } from "@/lib/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";
import { parsePlaidError } from "@/lib/plaid-errors";

export async function POST(request: NextRequest) {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { public_token, institution } = body;

  if (!public_token) {
    return NextResponse.json({ error: "Public token required" }, { status: 400 });
  }

  try {
    const plaid = await getPlaidClient();
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchange.data;

    const existing = await db.plaidItem.findUnique({ where: { itemId: item_id } });
    if (existing) {
      const syncResult = await syncPlaidItem(existing.id);
      return NextResponse.json({
        itemId: existing.id,
        institutionName: existing.institutionName,
        ...syncResult,
        message: "Bank already connected — synced latest data",
      });
    }

    const plaidItem = await db.plaidItem.create({
      data: {
        itemId: item_id,
        accessToken: access_token,
        institutionId: institution?.institution_id ?? null,
        institutionName: institution?.name ?? "Connected Bank",
      },
    });

    const syncResult = await syncPlaidItem(plaidItem.id);

    return NextResponse.json({
      itemId: plaidItem.id,
      institutionName: plaidItem.institutionName,
      ...syncResult,
      message: "Bank connected successfully",
    });
  } catch (error) {
    console.error("Plaid exchange error:", error);
    return NextResponse.json(
      { error: parsePlaidError(error) },
      { status: 500 }
    );
  }
}
