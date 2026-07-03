/**
 * Backfill tenantId on all finance documents in Firestore and create a default household.
 *
 * Usage:
 *   LEGACY_TENANT_ID=legacy-household OWNER_EMAIL=jeremy@havoccalls.com npx tsx scripts/backfill-tenant-data.ts
 *
 * Requires Application Default Credentials or FIREBASE_SERVICE_ACCOUNT_KEY.
 */
import "dotenv/config";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "personal-finance-ed108";

const LEGACY_TENANT_ID = process.env.LEGACY_TENANT_ID ?? "legacy-household";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "jeremy@havoccalls.com";
const OWNER_USER_ID = process.env.OWNER_USER_ID ?? "legacy-owner";

const FINANCE_COLLECTIONS = [
  "accounts",
  "categories",
  "transactions",
  "budgets",
  "goals",
  "envelopePools",
  "envelopes",
  "envelopeTransfers",
  "envelopePoolFundings",
  "plaidItems",
  "paySchedules",
  "scheduledExpenses",
  "scheduleDateAdjustments",
];

function cuid() {
  return randomBytes(12).toString("hex");
}

function getDb() {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
    } else {
      initializeApp({ projectId: PROJECT_ID });
    }
  }
  return getFirestore();
}

async function backfillCollection(db: FirebaseFirestore.Firestore, name: string) {
  const snap = await db.collection(name).get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.tenantId) {
      skipped += 1;
      continue;
    }
    await doc.ref.set({ tenantId: LEGACY_TENANT_ID }, { merge: true });
    updated += 1;
  }

  return { collection: name, updated, skipped, total: snap.size };
}

async function ensureTenant(db: FirebaseFirestore.Firestore) {
  const tenantRef = db.collection("tenants").doc(LEGACY_TENANT_ID);
  const tenantDoc = await tenantRef.get();
  if (!tenantDoc.exists) {
    const now = new Date().toISOString();
    await tenantRef.set({
      name: "Jeremy & Candice Household",
      slug: "jeremy-candice",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created tenant ${LEGACY_TENANT_ID}`);
  } else {
    console.log(`Tenant ${LEGACY_TENANT_ID} already exists`);
  }

  const memberSnap = await db
    .collection("tenantMembers")
    .where("tenantId", "==", LEGACY_TENANT_ID)
    .limit(1)
    .get();

  if (memberSnap.empty) {
    const now = new Date().toISOString();
    await db
      .collection("tenantMembers")
      .doc(cuid())
      .set({
        tenantId: LEGACY_TENANT_ID,
        userId: OWNER_USER_ID,
        email: OWNER_EMAIL.toLowerCase(),
        role: "OWNER",
        createdAt: now,
        updatedAt: now,
      });
    console.log(`Created owner member for ${OWNER_EMAIL}`);
  } else {
    console.log("Tenant already has at least one member");
  }
}

async function main() {
  const db = getDb();
  console.log(`Backfilling Firestore project ${PROJECT_ID} → tenant ${LEGACY_TENANT_ID}`);

  await ensureTenant(db);

  const results = [];
  for (const name of FINANCE_COLLECTIONS) {
    const result = await backfillCollection(db, name);
    results.push(result);
    console.log(
      `${name}: ${result.updated} updated, ${result.skipped} already scoped, ${result.total} total`
    );
  }

  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  console.log(`\nDone. Backfilled tenantId on ${totalUpdated} documents.`);
  console.log(
    `\nAfter the owner signs in with Firebase Auth (${OWNER_EMAIL}), update tenantMembers.userId to their Firebase UID if it differs from ${OWNER_USER_ID}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
