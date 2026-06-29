import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { importSyncedAccount } from "@/lib/plaid-sync";

export async function GET() {
  const accounts = await db.account.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { transactions: true } },
    },
  });
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.plaidAccountId && body.plaidItemId) {
    try {
      const account = await importSyncedAccount(
        String(body.plaidAccountId),
        String(body.plaidItemId)
      );
      return NextResponse.json(account, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import synced account";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const account = await db.account.create({
    data: {
      name: body.name,
      type: body.type,
      institution: body.institution || null,
      balance: parseFloat(body.balance) || 0,
      color: body.color || "#6366f1",
      icon: body.icon || "wallet",
      isArchived: false,
      isLinked: false,
      ...(body.plaidItemId && { plaidItemId: String(body.plaidItemId) }),
    },
  });
  return NextResponse.json(account, { status: 201 });
}
