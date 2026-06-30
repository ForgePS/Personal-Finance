import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  return safeEqual(auth.slice(7), secret);
}
