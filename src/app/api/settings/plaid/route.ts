import { NextRequest, NextResponse } from "next/server";
import { getPlaidCredentials, savePlaidCredentials } from "@/lib/plaid-config";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async () => {
  const creds = await getPlaidCredentials();
  return NextResponse.json({
    configured: Boolean(creds),
    clientId: creds?.clientId ?? "",
    env: creds?.env ?? "production",
    hasSecret: Boolean(creds?.secret),
  });
});

export const POST = withAuth(async (request: NextRequest, auth) => {
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
});
