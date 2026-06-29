import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAccountBalanceFromTransaction } from "@/lib/services";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100");

  const transactions = await db.transaction.findMany({
    where: {
      ...(accountId && { accountId }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { description: { contains: search } },
          { merchant: { contains: search } },
        ],
      }),
    },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
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
      isTransfer: body.isTransfer || false,
    },
    include: { category: true, account: true },
  });

  await updateAccountBalanceFromTransaction(body.accountId, amount);
  return NextResponse.json(transaction, { status: 201 });
}
