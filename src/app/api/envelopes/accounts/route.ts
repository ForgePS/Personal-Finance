import { NextResponse } from "next/server";
import { getAvailableEnvelopeAccounts } from "@/lib/envelope-service";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async () => {
  const accounts = await getAvailableEnvelopeAccounts();
  return NextResponse.json(accounts);
});
