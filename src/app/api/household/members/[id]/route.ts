import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/api-auth";
import { removeHouseholdMember } from "@/lib/household-service";

export const DELETE = withAuthContext(
  async (_request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    try {
      await removeHouseholdMember(id, auth.tenantId, auth.userId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to remove member" },
        { status: 400 }
      );
    }
  }
);
