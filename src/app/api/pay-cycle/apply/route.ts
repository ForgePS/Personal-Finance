import { NextRequest, NextResponse } from "next/server";
import { applyPayCyclePlan } from "@/lib/pay-cycle-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const monthKey = String(body.monthKey ?? "");
    const accountId = String(body.accountId ?? "");
    const poolAmount = Number(body.poolAmount ?? 0);
    const allocations = Array.isArray(body.allocations) ? body.allocations : [];
    const note = body.note ? String(body.note) : undefined;

    if (!monthKey || !accountId) {
      return NextResponse.json(
        { error: "Month and funding account are required" },
        { status: 400 }
      );
    }

    const data = await applyPayCyclePlan({
      monthKey,
      accountId,
      poolAmount,
      allocations: allocations.map((item: Record<string, unknown>) => ({
        categoryId: String(item.categoryId),
        amount: Number(item.amount),
      })),
      note,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply pay cycle plan" },
      { status: 400 }
    );
  }
}
