import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "./auth-server";
import type { AuthContext } from "./auth-server";
import { runWithTenantAsync } from "./tenant-context";

type RouteContext = { params: Promise<Record<string, string>> };

export function withAuth(
  handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return runWithTenantAsync(auth, () => handler(request, auth));
  };
}

export function withAuthContext<T extends RouteContext = RouteContext>(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    context: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T) => {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return runWithTenantAsync(auth, () => handler(request, auth, context));
  };
}
