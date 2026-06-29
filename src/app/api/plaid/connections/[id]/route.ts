import { NextRequest, NextResponse } from "next/server";
import { disconnectBank } from "@/lib/plaid-sync";
import { isPlaidConfigured } from "@/lib/plaid";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
