import { NextRequest, NextResponse } from "next/server";
import { isFirebaseProduction } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get("deep") === "1";

  const base = {
    ok: true,
    service: "personal-finance",
    mode: isFirebaseProduction() ? "firestore" : "sqlite",
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      null,
    useFirestore: process.env.USE_FIRESTORE === "true",
  };

  if (!deep) {
    return NextResponse.json(base);
  }

  try {
    const { db } = await import("@/lib/db");
    const accounts = await db.account.findMany({
      where: { isArchived: false },
      take: 1,
    });
    return NextResponse.json({
      ...base,
      firestore: { ok: true, sampleAccountCount: accounts.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Health deep check failed:", error);
    return NextResponse.json(
      {
        ...base,
        ok: false,
        firestore: { ok: false, error: message },
        hint:
          message.includes("PERMISSION_DENIED") || message.includes("permission")
            ? "Enable Firestore and grant roles/datastore.user to firebase-app-hosting-compute@personal-finance-ed108.iam.gserviceaccount.com"
            : message.includes("SQLite") || message.includes("better-sqlite3")
              ? "App is still loading SQLite instead of Firestore — redeploy latest main."
              : "Check App Hosting runtime logs for the full stack trace.",
      },
      { status: 500 }
    );
  }
}
