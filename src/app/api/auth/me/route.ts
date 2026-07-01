import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request as import("next/server").NextRequest);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    userId: auth.userId,
    email: auth.email,
    tenantId: auth.tenantId,
    tenantName: auth.tenantName,
  });
}
