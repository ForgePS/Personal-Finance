import { db } from "@/lib/db";
import { isLiability } from "@/lib/constants";
import { updateAccountBalanceFromTransaction } from "@/lib/services";

async function validateDebtAccount(debtAccountId: string, payingAccountId: string) {
  if (debtAccountId === payingAccountId) {
    throw new Error("Debt account must be different from the paying account");
  }
  const debtAccount = await db.account.findUnique({ where: { id: debtAccountId } });
  if (!debtAccount) throw new Error("Debt account not found");
  if (!isLiability(debtAccount.type)) {
    throw new Error("Debt payments must be linked to a liability account");
  }
  return debtAccount;
}

function debtPaymentAmount(expenseAmount: number) {
  return Math.abs(expenseAmount);
}

export async function applyDebtPaymentBalance(
  payingAccountId: string,
  debtAccountId: string,
  expenseAmount: number
) {
  const payment = debtPaymentAmount(expenseAmount);
  await updateAccountBalanceFromTransaction(debtAccountId, payment);
}

export async function reverseDebtPaymentBalance(
  payingAccountId: string,
  debtAccountId: string,
  expenseAmount: number
) {
  const payment = debtPaymentAmount(expenseAmount);
  await updateAccountBalanceFromTransaction(debtAccountId, -payment);
}

export async function validateDebtPayment(
  payingAccountId: string,
  debtAccountId: string | null | undefined
) {
  if (!debtAccountId) return;
  await validateDebtAccount(debtAccountId, payingAccountId);
}

export async function syncDebtPaymentBalanceChange(
  previous: {
    accountId: string;
    debtAccountId: string | null;
    amount: number;
  },
  next: {
    accountId: string;
    debtAccountId: string | null;
    amount: number;
  }
) {
  if (previous.debtAccountId) {
    await reverseDebtPaymentBalance(
      previous.accountId,
      previous.debtAccountId,
      previous.amount
    );
  }
  if (next.debtAccountId && next.amount < 0) {
    await validateDebtAccount(next.debtAccountId, next.accountId);
    await applyDebtPaymentBalance(next.accountId, next.debtAccountId, next.amount);
  }
}

export function getDebtPaymentCreditForAccount(
  tx: { accountId: string; debtAccountId?: string | null; amount: number },
  accountId: string
) {
  if (tx.debtAccountId === accountId && tx.accountId !== accountId && tx.amount < 0) {
    return debtPaymentAmount(tx.amount);
  }
  return tx.amount;
}

export function getTransactionDisplayAmountForAccount(
  tx: {
    accountId: string;
    transferAccountId?: string | null;
    debtAccountId?: string | null;
    amount: number;
    isTransfer?: boolean;
  },
  accountId: string
) {
  if (tx.isTransfer && tx.transferAccountId) {
    if (tx.accountId === accountId) return tx.amount;
    if (tx.transferAccountId === accountId) return -tx.amount;
  }
  return getDebtPaymentCreditForAccount(tx, accountId);
}
