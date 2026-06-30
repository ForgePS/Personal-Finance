import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";
import { deleteTransfer, updateTransfer } from "@/lib/transfer-service";
import {
  applyDebtPaymentBalance,
  reverseDebtPaymentBalance,
  syncDebtPaymentBalanceChange,
  validateDebtPayment,
} from "@/lib/debt-payment-service";

const transactionInclude = {
  category: true,
  account: true,
  transferAccount: true,
  debtAccount: true,
};

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

  const wasTransfer = existing.isTransfer && existing.transferAccountId;
  const becomingTransfer = body.isTransfer === true;

  if (wasTransfer || becomingTransfer) {
    try {
      if (wasTransfer && !becomingTransfer) {
        await deleteTransfer(existing);
        const newAmount = body.amount !== undefined ? parseFloat(body.amount) : existing.amount;
        const newAccountId = body.accountId ?? existing.accountId;
        const debtAccountId =
          body.debtAccountId !== undefined ? body.debtAccountId || null : existing.debtAccountId;

        await validateDebtPayment(newAccountId, debtAccountId);

        const transaction = await db.transaction.update({
          where: { id },
          data: {
            transferAccountId: null,
            isTransfer: false,
            debtAccountId,
            ...(body.accountId !== undefined && { accountId: body.accountId }),
            ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
            ...(body.date !== undefined && { date: new Date(body.date) }),
            ...(body.amount !== undefined && { amount: newAmount }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.merchant !== undefined && { merchant: body.merchant }),
            ...(body.notes !== undefined && { notes: body.notes }),
          },
          include: transactionInclude,
        });

        await updateAccountBalanceFromTransaction(newAccountId, newAmount);
        if (debtAccountId && newAmount < 0) {
          await applyDebtPaymentBalance(newAccountId, debtAccountId, newAmount);
        }
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
  const newDebtAccountId =
    body.debtAccountId !== undefined ? body.debtAccountId || null : existing.debtAccountId;

  try {
    await validateDebtPayment(newAccountId, newDebtAccountId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid debt payment" },
      { status: 400 }
    );
  }

  const transaction = await db.transaction.update({
    where: { id },
    data: {
      ...(body.accountId !== undefined && { accountId: body.accountId }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
      ...(body.debtAccountId !== undefined && { debtAccountId: body.debtAccountId || null }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.amount !== undefined && { amount: newAmount }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.merchant !== undefined && { merchant: body.merchant }),
      ...(body.notes !== undefined && { notes: body.notes }),
      isTransfer: false,
      transferAccountId: null,
    },
    include: transactionInclude,
  });

  if (existing.accountId === newAccountId) {
    await updateAccountBalanceFromTransaction(newAccountId, newAmount, existing.amount);
  } else {
    await updateAccountBalanceFromTransaction(existing.accountId, -existing.amount);
    await updateAccountBalanceFromTransaction(newAccountId, newAmount);
  }

  await syncDebtPaymentBalanceChange(
    {
      accountId: existing.accountId,
      debtAccountId: existing.debtAccountId,
      amount: existing.amount,
    },
    {
      accountId: newAccountId,
      debtAccountId: newDebtAccountId,
      amount: newAmount,
    }
  );

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
    if (existing.debtAccountId && existing.amount < 0) {
      await reverseDebtPaymentBalance(
        existing.accountId,
        existing.debtAccountId,
        existing.amount
      );
    }
  }

  await db.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
