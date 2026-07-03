import { NextRequest, NextResponse } from "next/server";
import {
  createSessionCookie,
  resolveOrCreateTenant,
  verifyIdToken,
  isAuthBypassEnabled,
} from "@/lib/auth-server";
import { syncMemberEmail } from "@/lib/tenant-repository";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export async function POST(request: NextRequest) {
  if (isAuthBypassEnabled()) {
    const { tenantId, tenantName } = await resolveOrCreateTenant(
      "dev-user",
      "dev@moneycommand.local"
    );
    const response = NextResponse.json({ ok: true, tenantId, tenantName });
    response.cookies.set(SESSION_COOKIE_NAME, "dev-bypass", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const idToken = String(body.idToken ?? "");
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  const session = await verifyIdToken(idToken);
  if (!session) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const sessionCookie = await createSessionCookie(idToken);
  const { tenantId, tenantName } = await resolveOrCreateTenant(session.uid, session.email);
  await syncMemberEmail(session.uid, session.email);

  const response = NextResponse.json({ ok: true, tenantId, tenantName });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
