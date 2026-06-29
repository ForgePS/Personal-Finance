import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type AccountSubtype,
  type AccountType as PlaidAccountType,
} from "plaid";
import { getPlaidCredentials, isPlaidConfiguredAsync } from "@/lib/plaid-config";

export { isPlaidConfiguredAsync as isPlaidConfigured };

export async function getPlaidClient(): Promise<PlaidApi> {
  const creds = await getPlaidCredentials();
  if (!creds) {
    throw new Error("Plaid is not configured. Add keys in Settings → Bank Linking or .env locally.");
  }

  const basePath =
    creds.env === "production"
      ? PlaidEnvironments.production
      : creds.env === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": creds.clientId,
        "PLAID-SECRET": creds.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];

export function mapPlaidAccountType(
  type: PlaidAccountType,
  subtype: AccountSubtype | null
): "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" {
  if (type === "credit") return "CREDIT_CARD";
  if (type === "investment") return "INVESTMENT";
  if (type === "loan") return "LOAN";
  if (type === "depository") {
    if (subtype === "savings" || subtype === "cd" || subtype === "money market") {
      return "SAVINGS";
    }
    return "CHECKING";
  }
  return "CASH";
}

export function mapPlaidAccountIcon(
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH"
): string {
  const icons: Record<string, string> = {
    CHECKING: "landmark",
    SAVINGS: "piggy-bank",
    CREDIT_CARD: "credit-card",
    INVESTMENT: "trending-up",
    LOAN: "banknote",
    CASH: "wallet",
  };
  return icons[type] ?? "wallet";
}

export function convertPlaidAmount(amount: number): number {
  return -amount;
}
