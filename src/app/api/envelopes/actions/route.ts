import { NextRequest, NextResponse } from "next/server";
import {
  fundEnvelope,
  transferBetweenEnvelopes,
  returnToPool,
  createEnvelope,
  deactivateEnvelope,
  fundPoolFromAccounts,
  reconcileTransaction,
  setEnvelopeBudget,
  resetEnvelopeMonth,
  setEnvelopeSpendingStart,
} from "@/lib/envelope-service";
import { parseEnvelopeMonthInput, getMonthKey } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const month = parseEnvelopeMonthInput(body.month ?? getMonthKey(new Date()));

  try {
    let data;

    switch (body.action) {
      case "fund": {
        const amount = parseFloat(body.amount);
        if (isNaN(amount)) {
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        if (!body.categoryId) {
          return NextResponse.json({ error: "Category required" }, { status: 400 });
        }
        data = await fundEnvelope(body.categoryId, month, amount);
        break;
      }
      case "transfer": {
        const amount = parseFloat(body.amount);
        if (isNaN(amount)) {
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
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
      }
      case "return": {
        const amount = parseFloat(body.amount);
        if (isNaN(amount)) {
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        if (!body.categoryId) {
          return NextResponse.json({ error: "Category required" }, { status: 400 });
        }
        data = await returnToPool(body.categoryId, month, amount);
        break;
      }
      case "create-envelope": {
        if (!body.categoryId) {
          return NextResponse.json({ error: "Category required" }, { status: 400 });
        }
        const budgetAmount =
          body.budgetAmount != null && body.budgetAmount !== ""
            ? parseFloat(body.budgetAmount)
            : null;
        data = await createEnvelope(body.categoryId, month, budgetAmount);
        break;
      }
      case "set-budget": {
        if (!body.envelopeId) {
          return NextResponse.json({ error: "Envelope required" }, { status: 400 });
        }
        const budgetAmount =
          body.budgetAmount === null || body.budgetAmount === ""
            ? null
            : parseFloat(body.budgetAmount);
        if (budgetAmount != null && (isNaN(budgetAmount) || budgetAmount < 0)) {
          return NextResponse.json({ error: "Invalid budget amount" }, { status: 400 });
        }
        data = await setEnvelopeBudget(body.envelopeId, month, budgetAmount);
        break;
      }
      case "deactivate-envelope": {
        if (!body.envelopeId) {
          return NextResponse.json({ error: "Envelope required" }, { status: 400 });
        }
        data = await deactivateEnvelope(body.envelopeId, month);
        break;
      }
      case "fund-pool": {
        const fundings = Array.isArray(body.fundings) ? body.fundings : [];
        data = await fundPoolFromAccounts(month, fundings, body.note);
        break;
      }
      case "reconcile": {
        if (!body.transactionId || !body.categoryId) {
          return NextResponse.json({ error: "Transaction and category required" }, { status: 400 });
        }
        data = await reconcileTransaction(body.transactionId, body.categoryId, month);
        break;
      }
      case "reset-month": {
        data = await resetEnvelopeMonth(month, {
          spendingStartDate: body.spendingStartDate ?? null,
        });
        break;
      }
      case "set-spending-start": {
        data = await setEnvelopeSpendingStart(month, body.spendingStartDate ?? null);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
