import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";

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

  // Reverse the balance effects this account's transactions had on OTHER
  // accounts (transfers and debt payments), then remove the transactions
  // themselves so no orphan records are left behind (Firestore has no cascade).
  const ownedTransactions = await db.transaction.findMany({ where: { accountId: id } });

  for (const tx of ownedTransactions) {
    if (tx.isTransfer && tx.transferAccountId && tx.transferAccountId !== id) {
      // Undo the credit applied to the destination account.
      await updateAccountBalanceFromTransaction(tx.transferAccountId, tx.amount);
    }
    if (tx.debtAccountId && tx.debtAccountId !== id && tx.amount < 0) {
      // Undo the debt-balance reduction applied to the linked liability.
      await updateAccountBalanceFromTransaction(tx.debtAccountId, tx.amount);
    }
  }

  // Detach transactions on other accounts that referenced this one.
  const incomingTransfers = await db.transaction.findMany({
    where: { transferAccountId: id },
  });
  for (const tx of incomingTransfers) {
    if (tx.accountId === id) continue;
    await db.transaction.update({
      where: { id: tx.id },
      data: { transferAccountId: null, isTransfer: false },
    });
  }

  const debtPayments = await db.transaction.findMany({ where: { debtAccountId: id } });
  for (const tx of debtPayments) {
    if (tx.accountId === id) continue;
    await db.transaction.update({
      where: { id: tx.id },
      data: { debtAccountId: null },
    });
  }

  // Remove the account's own transactions (Prisma cascades, Firestore does not).
  for (const tx of ownedTransactions) {
    await db.transaction.delete({ where: { id: tx.id } });
  }

  await db.account.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
