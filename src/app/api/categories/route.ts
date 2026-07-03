import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeCategory } from "@/lib/category-utils";
import { withAuth } from "@/lib/api-auth";
import { withTenantData } from "@/lib/tenant-where";

export const GET = withAuth(async (request: NextRequest, auth) => {
  const type = request.nextUrl.searchParams.get("type");
  const categories = await db.category.findMany({
    where: type ? { type: type as "INCOME" | "EXPENSE" } : undefined,
    orderBy: { name: "asc" },
    include: { children: true },
  });
  return NextResponse.json(categories.map((category) => normalizeCategory(category)));
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const category = await db.category.create({
    data: withTenantData({
      name: body.name,
      type: body.type,
      icon: body.icon || "tag",
      color: body.color || "#8b5cf6",
      parentId: body.parentId || null,
      budgetable: body.budgetable !== false,
    }),
  });
  return NextResponse.json(normalizeCategory(category), { status: 201 });
});
