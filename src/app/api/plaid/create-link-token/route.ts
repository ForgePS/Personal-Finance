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
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    );
  }
}
