import { isFirebaseProduction, getDb } from "@/lib/firebase/admin";

export interface PlaidCredentials {
  clientId: string;
  secret: string;
  env: string;
}

const CONFIG_COLLECTION = "appConfig";
const CONFIG_DOC = "plaid";

export async function getPlaidCredentials(): Promise<PlaidCredentials | null> {
  if (process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET) {
    return {
      clientId: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      env: process.env.PLAID_ENV || "production",
    };
  }

  if (!isFirebaseProduction()) return null;

  const snap = await getDb().collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.clientId || !data?.secret) return null;

  return {
    clientId: String(data.clientId),
    secret: String(data.secret),
    env: String(data.env || "production"),
  };
}

export async function savePlaidCredentials(credentials: PlaidCredentials): Promise<void> {
  if (!isFirebaseProduction()) {
    throw new Error("Save Plaid keys via .env when running locally.");
  }

  await getDb()
    .collection(CONFIG_COLLECTION)
    .doc(CONFIG_DOC)
    .set({
      clientId: credentials.clientId,
      secret: credentials.secret,
      env: credentials.env || "production",
      updatedAt: new Date().toISOString(),
    });
}

export async function isPlaidConfiguredAsync(): Promise<boolean> {
  const creds = await getPlaidCredentials();
  return creds !== null;
}
