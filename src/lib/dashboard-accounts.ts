export const DEFAULT_DASHBOARD_ACCOUNT_NAME = "Jeremy Candice";

export function resolveDashboardAccountId(
  accounts: { id: string; name: string }[],
  accountIdParam?: string | null
): string | null {
  if (accountIdParam === "all") return null;
  if (accountIdParam && accounts.some((account) => account.id === accountIdParam)) {
    return accountIdParam;
  }

  const defaultAccount = accounts.find((account) => account.name === DEFAULT_DASHBOARD_ACCOUNT_NAME);
  return defaultAccount?.id ?? null;
}

export function accountTransactionWhere(accountId: string) {
  return {
    OR: [
      { accountId },
      { transferAccountId: accountId },
      { debtAccountId: accountId },
    ],
  };
}
