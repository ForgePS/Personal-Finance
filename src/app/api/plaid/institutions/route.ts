import { NextResponse } from "next/server";
import { getAvailableSyncedAccounts } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async () => {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ configured: false, accounts: [] });
  }

  const accounts = await getAvailableSyncedAccounts();
  return NextResponse.json({ configured: true, accounts });
});
