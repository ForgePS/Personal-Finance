import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";
import { deleteTransfer } from "@/lib/transfer-service";
import {
  reverseDebtPaymentBalance,
  syncDebtPaymentBalanceChange,
  validateDebtPayment,
} from "@/lib/debt-payment-service";
import { withAuth } from "@/lib/api-auth";

interface BulkUpdates {
  categoryId?: string | null;
  accountId?: string;
  date?: string;
  debtAccountId?: string | null;
  clearDebtPayment?: boolean;
}

async function applyBulkUpdate(
  existing: {
    id: string;
    accountId: string;
    transferAccountId: string | null;
    debtAccountId: string | null;
    categoryId: string | null;
    date: Date;
    amount: number;
    isTransfer: boolean;
  },
  updates: BulkUpdates
) {
  if (existing.isTransfer && existing.transferAccountId) {
    return { status: "skipped" as const, reason: "legacy_transfer" };
  }

  const newAccountId = updates.accountId ?? existing.accountId;
  const newDebtAccountId = updates.clearDebtPayment
    ? null
    : updates.debtAccountId !== undefined
      ? updates.debtAccountId || null
      : existing.debtAccountId;
  const newCategoryId =
    updates.categoryId !== undefined ? updates.categoryId || null : existing.categoryId;
  const newDate = updates.date !== undefined ? new Date(updates.date) : existing.date;
  const newAmount = existing.amount;

  if (updates.categoryId !== undefined && updates.categoryId) {
    const category = await db.category.findUnique({ where: { id: updates.categoryId } });
    if (!category) {
      return { status: "skipped" as const, reason: "category_not_found" };
    }
    const isExpense = existing.amount < 0;
    if (
      (isExpense && category.type !== "EXPENSE") ||
      (!isExpense && category.type !== "INCOME")
    ) {
      return { status: "skipped" as const, reason: "category_type_mismatch" };
    }
  }

  if (newDebtAccountId && newAmount >= 0) {
    return { status: "skipped" as const, reason: "debt_payment_requires_expense" };
  }

  try {
    await validateDebtPayment(newAccountId, newDebtAccountId);
  } catch (error) {
    return {
      status: "skipped" as const,
      reason: error instanceof Error ? error.message : "invalid_debt_payment",
    };
  }

  await db.transaction.update({
    where: { id: existing.id },
    data: {
      ...(updates.accountId !== undefined && { accountId: newAccountId }),
      ...(updates.categoryId !== undefined && { categoryId: newCategoryId }),
      ...(updates.date !== undefined && { date: newDate }),
      ...(updates.debtAccountId !== undefined || updates.clearDebtPayment
        ? { debtAccountId: newDebtAccountId }
        : {}),
      isTransfer: false,
      transferAccountId: null,
    },
  });

  if (updates.accountId !== undefined && existing.accountId !== newAccountId) {
    await updateAccountBalanceFromTransaction(existing.accountId, -existing.amount);
    await updateAccountBalanceFromTransaction(newAccountId, newAmount);
  }

  if (updates.debtAccountId !== undefined || updates.clearDebtPayment) {
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
  }

  return { status: "updated" as const };
}

export const PATCH = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const updates: BulkUpdates = body.updates ?? {};

  if (ids.length === 0) {
    return NextResponse.json({ error: "No transactions selected" }, { status: 400 });
  }

  const hasChange =
    updates.categoryId !== undefined ||
    updates.accountId !== undefined ||
    updates.date !== undefined ||
    updates.debtAccountId !== undefined ||
    updates.clearDebtPayment === true;

  if (!hasChange) {
    return NextResponse.json({ error: "No changes specified" }, { status: 400 });
  }

  const transactions = await db.transaction.findMany({
    where: { id: { in: ids } },
  });

  const results = {
    updated: 0,
    skipped: 0,
    skippedReasons: {} as Record<string, number>,
  };

  for (const existing of transactions) {
    const result = await applyBulkUpdate(existing, updates);
    if (result.status === "updated") {
      results.updated++;
    } else {
      results.skipped++;
      const reason = result.reason ?? "unknown";
      results.skippedReasons[reason] = (results.skippedReasons[reason] ?? 0) + 1;
    }
  }

  return NextResponse.json(results);
});

export const DELETE = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No transactions selected" }, { status: 400 });
  }

  const transactions = await db.transaction.findMany({
    where: { id: { in: ids } },
  });

  let deleted = 0;
  let skipped = 0;

  for (const existing of transactions) {
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

    try {
      await db.transaction.delete({ where: { id: existing.id } });
      deleted++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ deleted, skipped });
});
