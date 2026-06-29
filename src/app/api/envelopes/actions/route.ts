import { NextRequest, NextResponse } from "next/server";
import {
  fundEnvelope,
  transferBetweenEnvelopes,
  returnToPool,
} from "@/lib/envelope-service";
import { startOfMonth } from "date-fns";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const month = startOfMonth(new Date(body.month ?? new Date()));
  const amount = parseFloat(body.amount);

  if (isNaN(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    let data;
    switch (body.action) {
      case "fund":
        if (!body.categoryId) {
          return NextResponse.json({ error: "Category required" }, { status: 400 });
        }
        data = await fundEnvelope(body.categoryId, month, amount);
        break;
      case "transfer":
        if (!body.fromCategoryId || !body.toCategoryId) {
          return NextResponse.json({ error: "Source and destination required" }, { status: 400 });
        }
        data = await transferBetweenEnvelopes(
          body.fromCategoryId,
          body.toCategoryId,
          month,
          amount,
          body.note
        );
        break;
      case "return":
        if (!body.categoryId) {
          return NextResponse.json({ error: "Category required" }, { status: 400 });
        }
        data = await returnToPool(body.categoryId, month, amount);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
