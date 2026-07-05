"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const needsSetup =
    error.message.includes("findMany") ||
    error.message.includes("no such table") ||
    error.message.includes("better-sqlite3") ||
    error.message.includes("dev.db");

  const isProd = process.env.NODE_ENV === "production";
  const hint = needsSetup
    ? "Your database may need updating. Run npm run db:setup, then refresh."
    : error.message.includes("Unauthorized") || error.message.includes("NEXT_REDIRECT")
      ? "Your session expired. Please sign in again."
      : isProd
        ? "Check Firebase App Hosting runtime logs. Ensure Firestore is enabled for personal-finance-ed108."
        : error.message || "An unexpected error occurred. Try restarting the dev server after running npm run db:setup.";

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{hint}</p>
      {!isProd && error.digest && (
        <p className="mt-2 text-xs text-slate-400">Digest: {error.digest}</p>
      )}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
