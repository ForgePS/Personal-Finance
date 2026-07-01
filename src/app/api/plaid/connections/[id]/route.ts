import { NextRequest, NextResponse } from "next/server";
import { disconnectBank } from "@/lib/plaid-sync";
import { withAuthContext } from "@/lib/api-auth";
import { isPlaidConfigured } from "@/lib/plaid";

export const DELETE = withAuthContext(async (request: NextRequest, auth, { params }: { params: Promise<{ id: string }> }) => {
  if (!(await isPlaidConfigured())) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 503 });
  }

  const { id } = await params;

  try {
    await disconnectBank(id);
    return NextResponse.json({ success: true, message: "Bank disconnected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
