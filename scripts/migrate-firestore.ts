/**
 * Copy all Money Command Firestore data into Personal Finance.
 *
 * Prerequisites:
 *   - Service account JSON for SOURCE (Firestore read) and DEST (Firestore write)
 *   - Or one Google account with access to both projects + `gcloud auth application-default login`
 *
 * Usage:
 *   SOURCE_PROJECT_ID=money-command-3ee1b \
 *   DEST_PROJECT_ID=personal-finance-ed108 \
 *   SOURCE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *   DEST_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *   npx tsx scripts/migrate-firestore.ts
 *
 * Options:
 *   --dry-run     Count documents only, do not write
 *   --overwrite   Replace existing docs in destination (default: merge/set)
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const SOURCE_PROJECT = process.env.SOURCE_PROJECT_ID ?? "money-command-3ee1b";
const DEST_PROJECT = process.env.DEST_PROJECT_ID ?? "personal-finance-ed108";

const COLLECTIONS = [
  "categories",
  "plaidItems",
  "accounts",
  "transactions",
  "budgets",
  "goals",
  "envelopePools",
  "envelopes",
  "envelopePoolFundings",
  "envelopeTransfers",
  "paySchedules",
  "scheduledExpenses",
  "scheduleDateAdjustments",
  "appConfig",
] as const;

const BATCH_SIZE = 400;
const dryRun = process.argv.includes("--dry-run");

function parseServiceAccount(raw: string | undefined, label: string) {
  if (!raw) {
    throw new Error(
      `Missing ${label}. Download a service account key from Firebase Console → Project Settings → Service Accounts → Generate new private key.`
    );
  }
  return JSON.parse(raw) as Record<string, string>;
}

function initApp(name: string, projectId: string, serviceAccount?: Record<string, string>): App {
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;

  if (serviceAccount) {
    return initializeApp(
      { credential: cert(serviceAccount as Parameters<typeof cert>[0]), projectId },
      name
    );
  }

  return initializeApp({ projectId }, name);
}

async function copyCollection(
  sourceDb: Firestore,
  destDb: Firestore,
  collectionName: string
): Promise<number> {
  const snap = await sourceDb.collection(collectionName).get();
  if (snap.empty) {
    console.log(`  ${collectionName}: 0 documents (skipped)`);
    return 0;
  }

  if (dryRun) {
    console.log(`  ${collectionName}: ${snap.size} documents (dry run)`);
    return snap.size;
  }

  let written = 0;
  let batch = destDb.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    batch.set(destDb.collection(collectionName).doc(doc.id), doc.data(), { merge: false });
    batchCount++;
    written++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = destDb.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ${collectionName}: ${written} documents copied`);
  return written;
}

async function main() {
  console.log(`Firestore migration`);
  console.log(`  Source: ${SOURCE_PROJECT}`);
  console.log(`  Dest:   ${DEST_PROJECT}`);
  if (dryRun) console.log(`  Mode:   DRY RUN (no writes)`);
  console.log("");

  const sourceSa = process.env.SOURCE_SERVICE_ACCOUNT_KEY
    ? parseServiceAccount(process.env.SOURCE_SERVICE_ACCOUNT_KEY, "SOURCE_SERVICE_ACCOUNT_KEY")
    : undefined;
  const destSa = process.env.DEST_SERVICE_ACCOUNT_KEY
    ? parseServiceAccount(process.env.DEST_SERVICE_ACCOUNT_KEY, "DEST_SERVICE_ACCOUNT_KEY")
    : undefined;

  if (!sourceSa || !destSa) {
    console.error(
      "Set SOURCE_SERVICE_ACCOUNT_KEY and DEST_SERVICE_ACCOUNT_KEY to JSON strings from each Firebase project."
    );
    console.error("See FIRESTORE_MIGRATE.md for the gcloud export/import method (no keys required in Cloud Shell).");
    process.exit(1);
  }

  initApp("source", SOURCE_PROJECT, sourceSa);
  initApp("dest", DEST_PROJECT, destSa);

  const sourceDb = getFirestore(getApps().find((a) => a.name === "source")!);
  const destDb = getFirestore(getApps().find((a) => a.name === "dest")!);

  let total = 0;
  for (const name of COLLECTIONS) {
    total += await copyCollection(sourceDb, destDb, name);
  }

  console.log("");
  console.log(dryRun ? `Dry run complete: ${total} documents would be copied.` : `Done: ${total} documents copied.`);
  console.log("");
  console.log("Next: open Personal Finance app and verify accounts, transactions, and envelopes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
