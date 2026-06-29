import { NextResponse } from "next/server";
import { getAvailableEnvelopeAccounts } from "@/lib/envelope-service";

export async function GET() {
  const accounts = await getAvailableEnvelopeAccounts();
  return NextResponse.json(accounts);
}
