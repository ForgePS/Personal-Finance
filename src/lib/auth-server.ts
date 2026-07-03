import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getFirebaseAdmin } from "./firebase/admin";
import {
  ensureDevTenant,
  findMemberByUserId,
  findTenantById,
} from "./tenant-repository";
import { resolveOrCreateHousehold } from "./household-service";
import type { TenantContext } from "./tenant-context";
import { runWithTenantAsync } from "./tenant-context";

import { SESSION_COOKIE_NAME } from "./auth-constants";

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 14 * 1000;

export type AuthContext = TenantContext & {
  tenantName: string;
};

export function isAuthBypassEnabled() {
  return process.env.AUTH_BYPASS === "true";
}

function getDevAuthContext(): AuthContext {
  const tenantId = process.env.DEV_TENANT_ID ?? "seed-tenant";
  return {
    userId: "dev-user",
    tenantId,
    email: "dev@moneycommand.local",
    tenantName: "Development Workspace",
  };
}

export async function verifySessionCookie(
  sessionCookie: string | undefined
): Promise<{ uid: string; email: string } | null> {
  if (!sessionCookie) return null;

  if (isAuthBypassEnabled()) {
    return { uid: "dev-user", email: "dev@moneycommand.local" };
  }

  try {
    getFirebaseAdmin();
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? `${decoded.uid}@users.local`,
    };
  } catch {
    return null;
  }
}

export async function verifyIdToken(
  idToken: string
): Promise<{ uid: string; email: string } | null> {
  if (isAuthBypassEnabled()) {
    return { uid: "dev-user", email: "dev@moneycommand.local" };
  }

  try {
    getFirebaseAdmin();
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? `${decoded.uid}@users.local`,
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(idToken: string) {
  getFirebaseAdmin();
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

export async function resolveOrCreateTenant(
  userId: string,
  email: string
): Promise<{ tenantId: string; tenantName: string }> {
  if (isAuthBypassEnabled()) {
    const tenantId = process.env.DEV_TENANT_ID ?? "seed-tenant";
    return ensureDevTenant(tenantId, userId, email, "Development Workspace");
  }

  const existingMember = await findMemberByUserId(userId);
  if (existingMember) {
    const tenant = await findTenantById(existingMember.tenantId);
    return {
      tenantId: existingMember.tenantId,
      tenantName: tenant?.name ?? "Workspace",
    };
  }

  const tenant = await resolveOrCreateHousehold(userId, email);
  return tenant;
}

export async function getAuthContextFromSession(
  session: { uid: string; email: string } | null
): Promise<AuthContext | null> {
  if (!session) {
    if (isAuthBypassEnabled()) return getDevAuthContext();
    return null;
  }

  const { tenantId, tenantName } = await resolveOrCreateTenant(session.uid, session.email);
  return {
    userId: session.uid,
    email: session.email,
    tenantId,
    tenantName,
  };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isAuthBypassEnabled()) {
    return getDevAuthContext();
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookie(sessionCookie);
  return getAuthContextFromSession(session);
}

export async function requireAuthContext(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) {
    throw new Error("Unauthorized");
  }
  return auth;
}

export async function getAuthFromRequest(
  request: NextRequest
): Promise<AuthContext | null> {
  if (isAuthBypassEnabled()) {
    return getDevAuthContext();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookie(sessionCookie);
  return getAuthContextFromSession(session);
}

export async function withServerAuth<T>(fn: () => Promise<T>): Promise<T> {
  const auth = await requireAuthContext();
  return runWithTenantAsync(auth, fn);
}

export async function withOptionalServerAuth<T>(
  fn: () => Promise<T>
): Promise<T> {
  const auth = await getAuthContext();
  if (!auth) {
    throw new Error("Unauthorized");
  }
  return runWithTenantAsync(auth, fn);
}
