import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type AccountSubtype,
  type AccountType as PlaidAccountType,
} from "plaid";

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function getPlaidClient(): PlaidApi {
  if (!isPlaidConfigured()) {
    throw new Error("Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to your .env file.");
  }

  const env = process.env.PLAID_ENV || "sandbox";
  const basePath =
    env === "production"
      ? PlaidEnvironments.production
      : env === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
        "PLAID-SECRET": process.env.PLAID_SECRET!,
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
  // Plaid: positive = money out, negative = money in
  // Money Command: positive = income, negative = expense
  return -amount;
}
