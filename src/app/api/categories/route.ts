import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeCategory } from "@/lib/category-utils";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const categories = await db.category.findMany({
    where: type ? { type: type as "INCOME" | "EXPENSE" } : undefined,
    orderBy: { name: "asc" },
    include: { children: true },
  });
  return NextResponse.json(categories.map((category) => normalizeCategory(category)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const category = await db.category.create({
    data: {
      name: body.name,
      type: body.type,
      icon: body.icon || "tag",
      color: body.color || "#8b5cf6",
      parentId: body.parentId || null,
      budgetable: body.budgetable !== false,
    },
  });
  return NextResponse.json(normalizeCategory(category), { status: 201 });
}
