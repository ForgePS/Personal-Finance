import { NextRequest, NextResponse } from "next/server";
import { applyPaycheckAllocation } from "@/lib/paycheck-planner-service";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accountId = String(body.accountId ?? "");
  const allocations = Array.isArray(body.allocations)
    ? body.allocations.map((a: { categoryId: unknown; amount: unknown }) => ({
        categoryId: String(a.categoryId ?? ""),
        amount: Number(a.amount ?? 0),
      }))
    : [];

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const result = await applyPaycheckAllocation({
      accountId,
      allocations,
      note: body.note != null ? String(body.note) : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply allocation" },
      { status: 400 }
    );
  }
}
