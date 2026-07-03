import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { createHouseholdInvite } from "@/lib/household-service";
import { findMemberByUserId } from "@/lib/tenant-repository";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const member = await findMemberByUserId(auth.userId);
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Only household owners and admins can send invites" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (email.toLowerCase() === auth.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  try {
    const invite = await createHouseholdInvite({
      tenantId: auth.tenantId,
      email,
      invitedByUserId: auth.userId,
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://personal-finance--personal-finance-ed108.us-central1.hosted.app";

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
      inviteUrl: `${origin}/login?invite=${invite.token}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invite" },
      { status: 400 }
    );
  }
});
