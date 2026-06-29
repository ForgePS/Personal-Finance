import { NextResponse } from "next/server";
import {
  getPlaidClient,
  isPlaidConfigured,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
} from "@/lib/plaid";

export async function GET() {
  return NextResponse.json({ configured: isPlaidConfigured() });
}

export async function POST() {
  if (!isPlaidConfigured()) {
    return NextResponse.json(
      {
        error: "Plaid is not configured",
        message:
          "Add PLAID_CLIENT_ID and PLAID_SECRET to your .env file. Get free sandbox keys at https://dashboard.plaid.com",
      },
      { status: 503 }
    );
  }

  try {
    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: "money-command-user" },
      client_name: "Money Command",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error("Plaid link token error:", error);
    const plaidMessage =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "data" in error.response
        ? String(
            (error.response as { data?: { error_message?: string } }).data?.error_message ??
              (error.response as { data?: { display_message?: string } }).data?.display_message ??
              ""
          )
        : "";
    return NextResponse.json(
      {
        error: "Failed to create link token",
        message:
          plaidMessage ||
          "Check that PLAID_CLIENT_ID and PLAID_SECRET are correct sandbox keys from dashboard.plaid.com",
      },
      { status: 500 }
    );
  }
}
