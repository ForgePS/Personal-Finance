import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";
import { deleteTransfer, updateTransfer } from "@/lib/transfer-service";

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

  const becomingTransfer = body.isTransfer || body.transferAccountId;
  const wasTransfer = existing.isTransfer && existing.transferAccountId;

  if (wasTransfer || becomingTransfer) {
    try {
      if (wasTransfer && !becomingTransfer) {
        await deleteTransfer(existing);
        const newAmount = body.amount !== undefined ? parseFloat(body.amount) : existing.amount;
        const newAccountId = body.accountId ?? existing.accountId;

        const transaction = await db.transaction.update({
          where: { id },
          data: {
            transferAccountId: null,
            isTransfer: false,
            ...(body.accountId !== undefined && { accountId: body.accountId }),
            ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
            ...(body.date !== undefined && { date: new Date(body.date) }),
            ...(body.amount !== undefined && { amount: newAmount }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.merchant !== undefined && { merchant: body.merchant }),
            ...(body.notes !== undefined && { notes: body.notes }),
          },
          include: { category: true, account: true, transferAccount: true },
        });

        await updateAccountBalanceFromTransaction(newAccountId, newAmount);
        return NextResponse.json(transaction);
      }

      const transaction = await updateTransfer(existing, {
        fromAccountId: body.accountId,
        toAccountId: body.transferAccountId,
        amount: body.amount !== undefined ? Math.abs(parseFloat(body.amount)) : undefined,
        date: body.date !== undefined ? new Date(body.date) : undefined,
        description: body.description,
        merchant: body.merchant,
        notes: body.notes,
      });
      return NextResponse.json(transaction);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update transfer" },
        { status: 400 }
      );
    }
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
      ...(body.transferAccountId !== undefined && { transferAccountId: body.transferAccountId }),
    },
    include: { category: true, account: true, transferAccount: true },
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

  if (existing.isTransfer && existing.transferAccountId) {
    await deleteTransfer(existing);
  } else {
    await updateAccountBalanceFromTransaction(existing.accountId, -existing.amount);
  }

  await db.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
