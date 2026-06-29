import { NextResponse } from "next/server";
import { getConnectedBanks } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";

export async function GET() {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ configured: false, institutions: [] });
  }

  const items = await getConnectedBanks();
  const institutions = items.map((item) => ({
    id: item.id,
    name: item.institutionName || "Connected Bank",
    accounts: item.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      balance: account.balance,
    })),
  }));

  return NextResponse.json({ configured: true, institutions });
}
