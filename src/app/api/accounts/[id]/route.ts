import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = await db.account.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        take: 50,
        include: { category: true },
      },
    },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json(account);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const account = await db.account.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.institution !== undefined && { institution: body.institution }),
      ...(body.plaidItemId !== undefined && {
        plaidItemId: body.plaidItemId ? String(body.plaidItemId) : null,
      }),
      ...(body.balance !== undefined && { balance: parseFloat(body.balance) }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
    },
  });
  return NextResponse.json(account);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
