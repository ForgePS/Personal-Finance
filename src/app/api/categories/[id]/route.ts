import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuthContext } from "@/lib/api-auth";
import { normalizeCategory } from "@/lib/category-utils";

export const PATCH = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json();

  const category = await db.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.parentId !== undefined && { parentId: body.parentId || null }),
      ...(body.budgetable !== undefined && { budgetable: body.budgetable !== false }),
    },
    include: { children: true },
  });

  return NextResponse.json(normalizeCategory(category));
});

export const DELETE = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const [transactions, budgets, envelopes] = await Promise.all([
    db.transaction.findMany({ where: { categoryId: id }, take: 1 }),
    db.budget.findMany({ where: { categoryId: id }, take: 1 }),
    db.envelope.findMany({ where: { categoryId: id }, take: 1 }),
  ]);

  if (transactions.length > 0 || budgets.length > 0 || envelopes.length > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a category that has transactions, budgets, or envelopes. Reassign or remove them first.",
      },
      { status: 400 }
    );
  }

  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
