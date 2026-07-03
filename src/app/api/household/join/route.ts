import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { acceptHouseholdInvite } from "@/lib/household-service";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
  }

  try {
    const result = await acceptHouseholdInvite(token, auth.userId, auth.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invite" },
      { status: 400 }
    );
  }
});
