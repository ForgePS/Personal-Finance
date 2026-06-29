import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";
import { createTransfer } from "@/lib/transfer-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");

  const filters: Record<string, unknown>[] = [];
  if (accountId) {
    filters.push({ OR: [{ accountId }, { transferAccountId: accountId }] });
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
    include: { category: true, account: true, transferAccount: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.isTransfer || body.transferAccountId) {
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

  const transaction = await db.transaction.create({
    data: {
      accountId: body.accountId,
      categoryId: body.categoryId || null,
      date: new Date(body.date),
      amount,
      description: body.description,
      merchant: body.merchant || null,
      notes: body.notes || null,
      isTransfer: false,
    },
    include: { category: true, account: true, transferAccount: true },
  });

  await updateAccountBalanceFromTransaction(body.accountId, amount);
  return NextResponse.json(transaction, { status: 201 });
}
