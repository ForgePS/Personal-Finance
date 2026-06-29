import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await db.transaction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const newAmount = body.amount !== undefined ? parseFloat(body.amount) : existing.amount;
  const newAccountId = body.accountId ?? existing.accountId;

  const transaction = await db.transaction.update({
    where: { id },
    data: {
      ...(body.accountId !== undefined && { accountId: body.accountId }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.amount !== undefined && { amount: newAmount }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.merchant !== undefined && { merchant: body.merchant }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.isTransfer !== undefined && { isTransfer: body.isTransfer }),
    },
    include: { category: true, account: true },
  });

  if (existing.accountId === newAccountId) {
    await updateAccountBalanceFromTransaction(newAccountId, newAmount, existing.amount);
  } else {
    await updateAccountBalanceFromTransaction(existing.accountId, -existing.amount);
    await updateAccountBalanceFromTransaction(newAccountId, newAmount);
  }

  return NextResponse.json(transaction);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.transaction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await db.transaction.delete({ where: { id } });
  await updateAccountBalanceFromTransaction(existing.accountId, -existing.amount);

  return NextResponse.json({ success: true });
}
