import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const categories = await db.category.findMany({
    where: type ? { type: type as "INCOME" | "EXPENSE" } : undefined,
    orderBy: { name: "asc" },
    include: { children: true },
  });
  return NextResponse.json(categories);
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
      budgetable: body.budgetable ?? true,
    },
  });
  return NextResponse.json(category, { status: 201 });
}
