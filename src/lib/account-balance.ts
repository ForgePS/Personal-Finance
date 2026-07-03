import type { AccountType } from "@/generated/prisma/client";

type BalanceFields = {
  current?: number | null;
  available?: number | null;
};

export function isBankLinkedAccount(account: {
  isLinked?: boolean;
  plaidAccountId?: string | null;
}): boolean {
  return Boolean(account.isLinked && account.plaidAccountId);
}

/**
 * Pick the balance field that best matches what users see on their bank's website.
 * - Checking: available (spendable) when present
 * - Credit/loan: current (amount owed)
 * - Savings/investment: current (posted balance)
 */
export function resolvePlaidBalance(
  balances: BalanceFields,
  accountType: AccountType | string
): number {
  const current = balances.current ?? null;
  const available = balances.available ?? null;

  if (accountType === "CHECKING") {
    return available ?? current ?? 0;
  }

  if (accountType === "CREDIT_CARD" || accountType === "LOAN") {
    return current ?? available ?? 0;
  }

  return current ?? available ?? 0;
}

export function toStoredAccountBalance(
  rawBalance: number,
  accountType: AccountType | string
): number {
  const isLiability = accountType === "CREDIT_CARD" || accountType === "LOAN";
  return isLiability ? -Math.abs(rawBalance) : rawBalance;
}
