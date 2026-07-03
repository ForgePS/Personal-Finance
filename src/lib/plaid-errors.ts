interface PlaidErrorBody {
  error_code?: string;
  error_message?: string;
  display_message?: string | null;
}

function getPlaidErrorBody(error: unknown): PlaidErrorBody | undefined {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: PlaidErrorBody } }).response;
    return response?.data;
  }
  return undefined;
}

export function parsePlaidError(error: unknown): string {
  const data = getPlaidErrorBody(error);
  const code = data?.error_code;
  const message = data?.display_message || data?.error_message;

  switch (code) {
    case "ITEM_LOGIN_REQUIRED":
      return "Bank login expired. Disconnect this bank and connect it again to re-authenticate.";
    case "INVALID_ACCESS_TOKEN":
      return "Bank access expired. Disconnect and reconnect this institution in Settings → Bank Linking.";
    case "PRODUCT_NOT_READY":
      return "Your bank is still preparing transaction data. Wait a few minutes and tap Sync again.";
    case "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION":
      return "Sync was interrupted. Tap Sync again to continue.";
    case "INVALID_CURSOR":
      return "Sync cursor was reset. Tap Sync again to pull the latest transactions.";
    case "ITEM_NOT_FOUND":
      return "This bank link is no longer valid on Plaid. Disconnect and connect again.";
    default:
      break;
  }

  if (message) return message;
  if (error instanceof Error) return error.message;
  return "Sync failed";
}

export function isPlaidErrorCode(error: unknown, code: string): boolean {
  return getPlaidErrorBody(error)?.error_code === code;
}

export function normalizePlaidCursor(
  cursor: string | null | undefined
): string | undefined {
  if (!cursor?.trim()) return undefined;
  return cursor.trim();
}
