import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";
import { createTransfer } from "@/lib/transfer-service";
import {
  applyDebtPaymentBalance,
  validateDebtPayment,
} from "@/lib/debt-payment-service";
import {
  invalidateCategoryIndexCache,
  suggestCategoryFromHistory,
} from "@/lib/auto-categorize-service";
import { withAuth } from "@/lib/api-auth";
import { withTenantData } from "@/lib/tenant-where";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");

  const filters: Record<string, unknown>[] = [];
  if (accountId) {
    filters.push({
      OR: [{ accountId }, { transferAccountId: accountId }, { debtAccountId: accountId }],
    });
  }
  if (categoryId) {
    filters.push({ categoryId });
  }
  if (search) {
    filters.push({
      OR: [
        { description: { contains: search } },
        { merchant: { contains: search } },
      ],
    });
  }

  const transactions = await db.transaction.findMany({
    where: filters.length > 0 ? { AND: filters } : undefined,
    include: { category: true, account: true, transferAccount: true, debtAccount: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();

  if (body.isTransfer) {
    try {
      const transaction = await createTransfer({
        fromAccountId: body.accountId,
        toAccountId: body.transferAccountId,
        amount: Math.abs(parseFloat(body.amount)),
        date: new Date(body.date),
        description: body.description,
        merchant: body.merchant || null,
        notes: body.notes || null,
      });
      return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create transfer" },
        { status: 400 }
      );
    }
  }

  const amount = parseFloat(body.amount);
  const debtAccountId = body.debtAccountId || null;

  try {
    await validateDebtPayment(body.accountId, debtAccountId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid debt payment" },
      { status: 400 }
    );
  }

  let categoryId: string | null = body.categoryId || null;
  if (!categoryId && !debtAccountId) {
    const suggestion = await suggestCategoryFromHistory({
      description: body.description,
      merchant: body.merchant || null,
      amount,
      accountId: body.accountId,
    });
    if (suggestion) {
      categoryId = suggestion.categoryId;
    }
  }

  const transaction = await db.transaction.create({
    data: withTenantData({
      accountId: body.accountId,
      categoryId,
      debtAccountId,
      date: new Date(body.date),
      amount,
      description: body.description,
      merchant: body.merchant || null,
      notes: body.notes || null,
      isTransfer: false,
    }),
    include: { category: true, account: true, transferAccount: true, debtAccount: true },
  });

  await updateAccountBalanceFromTransaction(body.accountId, amount);
  if (debtAccountId && amount < 0) {
    await applyDebtPaymentBalance(body.accountId, debtAccountId, amount);
  }

  if (categoryId) {
    invalidateCategoryIndexCache();
  }

  return NextResponse.json(transaction, { status: 201 });
});
