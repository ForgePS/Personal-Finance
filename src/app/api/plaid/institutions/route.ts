import { NextResponse } from "next/server";
import { getAvailableSyncedAccounts } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";

export async function GET() {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ configured: false, accounts: [] });
  }

  const accounts = await getAvailableSyncedAccounts();
  return NextResponse.json({ configured: true, accounts });
}
