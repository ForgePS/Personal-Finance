import { NextRequest, NextResponse } from "next/server";
import { getPlaidCredentials, savePlaidCredentials } from "@/lib/plaid-config";

export async function GET() {
  const creds = await getPlaidCredentials();
  return NextResponse.json({
    configured: Boolean(creds),
    clientId: creds?.clientId ?? "",
    env: creds?.env ?? "production",
    hasSecret: Boolean(creds?.secret),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.clientId || !body.secret) {
    return NextResponse.json(
      { error: "Client ID and Secret are required" },
      { status: 400 }
    );
  }

  try {
    await savePlaidCredentials({
      clientId: String(body.clientId).trim(),
      secret: String(body.secret).trim(),
      env: String(body.env || "production"),
    });
    return NextResponse.json({ ok: true, message: "Plaid keys saved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Plaid keys";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
