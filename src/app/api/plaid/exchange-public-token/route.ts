import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlaidClient, isPlaidConfigured } from "@/lib/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";
import { withAuth } from "@/lib/api-auth";
import { withTenantData } from "@/lib/tenant-where";
import { plaidItemUniqueWhere } from "@/lib/tenant-where";

export const POST = withAuth(async (request: NextRequest, auth) => {
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

    const existing = await db.plaidItem.findUnique({ where: plaidItemUniqueWhere(item_id) });
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
      data: withTenantData({
        itemId: item_id,
        accessToken: access_token,
        institutionId: institution?.institution_id ?? null,
        institutionName: institution?.name ?? "Connected Bank",
      }),
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
      { error: "Failed to connect bank account" },
      { status: 500 }
    );
  }
});
