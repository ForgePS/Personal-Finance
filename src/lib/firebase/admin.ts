import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function isFirebaseProduction(): boolean {
  return (
    process.env.USE_FIRESTORE === "true" ||
    process.env.FIREBASE_DATABASE === "firestore" ||
    (process.env.NODE_ENV === "production" && Boolean(process.env.GOOGLE_CLOUD_PROJECT))
  );
}

export function getFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "money-command-3ee1b"
  );
}

let app: App;
let firestore: Firestore;

export function getFirebaseAdmin() {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: getFirebaseProjectId(),
      });
    } else {
      // Firebase App Hosting / Cloud Run: uses Application Default Credentials
      app = initializeApp({ projectId: getFirebaseProjectId() });
    }
  }
  return app;
}

export function getDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseAdmin());
  }
  return firestore;
}

// Collection names — match your Firebase project structure
export const COLLECTIONS = {
  accounts: "accounts",
  categories: "categories",
  transactions: "transactions",
  budgets: "budgets",
  goals: "goals",
  envelopePools: "envelopePools",
  envelopes: "envelopes",
  envelopeTransfers: "envelopeTransfers",
  plaidItems: "plaidItems",
} as const;

export function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function serializeDates<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Date) {
      (result as Record<string, unknown>)[key] = value.toISOString();
    }
  }
  return result;
}
