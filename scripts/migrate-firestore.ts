/**
 * Direct Firestore copy — no Cloud Storage, no export/import permissions.
 *
 * Cloud Shell (recommended):
 *   git clone https://github.com/ForgePS/Personal-Finance.git && cd Personal-Finance && npm install
 *   # Upload money-command-sa.json and personal-finance-sa.json via Cloud Shell ⋮ menu
 *   SOURCE_SA_FILE=~/money-command-sa.json DEST_SA_FILE=~/personal-finance-sa.json \
 *     npx tsx scripts/migrate-firestore.ts --dry-run
 *   SOURCE_SA_FILE=~/money-command-sa.json DEST_SA_FILE=~/personal-finance-sa.json \
 *     npx tsx scripts/migrate-firestore.ts
 */

import { readFileSync } from "fs";
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const SOURCE_PROJECT = process.env.SOURCE_PROJECT_ID ?? "money-command-3ee1b";
const DEST_PROJECT = process.env.DEST_PROJECT_ID ?? "personal-finance-ed108";

const KNOWN_COLLECTIONS = [
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
const copyAll = process.argv.includes("--all-collections");

function loadServiceAccount(label: string): Record<string, string> {
  const file = process.env[`${label}_SA_FILE`];
  const raw = process.env[`${label}_SERVICE_ACCOUNT_KEY`]
    ?? (file ? readFileSync(file, "utf8") : undefined);

  if (!raw) {
    throw new Error(
      `Missing ${label} credentials. Set ${label}_SA_FILE=/path/to/key.json or ${label}_SERVICE_ACCOUNT_KEY.`
    );
  }
  return JSON.parse(raw) as Record<string, string>;
}

function initApp(name: string, projectId: string, serviceAccount: Record<string, string>): App {
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;
  return initializeApp(
    { credential: cert(serviceAccount as Parameters<typeof cert>[0]), projectId },
    name
  );
}

async function listAllCollections(db: Firestore): Promise<string[]> {
  const refs = await db.listCollections();
  return refs.map((r) => r.id).sort();
}

async function copyCollection(
  sourceDb: Firestore,
  destDb: Firestore,
  collectionName: string
): Promise<number> {
  const snap = await sourceDb.collection(collectionName).get();
  if (snap.empty) {
    console.log(`  ${collectionName}: 0 documents`);
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
      process.stdout.write(`  ${collectionName}: ${written}/${snap.size}\r`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ${collectionName}: ${written} documents copied`);
  return written;
}

async function main() {
  console.log("Direct Firestore migration (no Cloud Storage required)");
  console.log(`  Source: ${SOURCE_PROJECT}`);
  console.log(`  Dest:   ${DEST_PROJECT}`);
  if (dryRun) console.log("  Mode:   DRY RUN");
  console.log("");

  const sourceSa = loadServiceAccount("SOURCE");
  const destSa = loadServiceAccount("DEST");

  initApp("source", SOURCE_PROJECT, sourceSa);
  initApp("dest", DEST_PROJECT, destSa);

  const sourceDb = getFirestore(getApps().find((a) => a.name === "source")!);
  const destDb = getFirestore(getApps().find((a) => a.name === "dest")!);

  let collections: string[];
  if (copyAll) {
    collections = await listAllCollections(sourceDb);
    console.log(`Copying all ${collections.length} collections from source...\n`);
  } else {
    collections = [...KNOWN_COLLECTIONS];
    console.log(`Copying ${collections.length} app collections...\n`);
  }

  let total = 0;
  for (const name of collections) {
    try {
      total += await copyCollection(sourceDb, destDb, name);
    } catch (err) {
      console.error(`  ${name}: FAILED —`, err instanceof Error ? err.message : err);
      throw err;
    }
  }

  console.log("");
  console.log(
    dryRun
      ? `Dry run complete: ${total} documents would be copied.`
      : `Done: ${total} documents copied to ${DEST_PROJECT}.`
  );
}

main().catch((err) => {
  console.error("\nMigration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
