"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EnvelopesError({
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
    error.message.includes("findUnique") ||
    error.message.includes("no such table") ||
    error.message.includes("EnvelopePool");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-bold text-slate-900">Envelopes failed to load</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {needsSetup
          ? "Your database may need updating. Stop the dev server, run npm run db:setup, then restart with npm run dev."
          : error.message || "An unexpected error occurred."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
