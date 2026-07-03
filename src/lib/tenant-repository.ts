import { rawDb } from "./db-prisma";
import { isFirebaseProduction } from "./firebase/admin";
import { getDb, serializeDates } from "./firebase/admin";
import { randomBytes } from "crypto";

function cuid() {
  return randomBytes(12).toString("hex");
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

type TenantRecord = { id: string; name: string; slug: string };
type TenantMemberRecord = {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  role: string;
};

async function firestoreFindMemberByUserId(userId: string) {
  const snap = await getDb()
    .collection("tenantMembers")
    .where("userId", "==", userId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as TenantMemberRecord;
}

async function firestoreFindTenantById(id: string) {
  const doc = await getDb().collection("tenants").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as TenantRecord;
}

async function firestoreFindTenantBySlug(slug: string) {
  const snap = await getDb()
    .collection("tenants")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as TenantRecord;
}

async function firestoreFindMemberByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const snap = await getDb()
    .collection("tenantMembers")
    .where("email", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as TenantMemberRecord;
}

async function firestoreUpdateMemberUserId(memberId: string, userId: string) {
  const now = new Date().toISOString();
  await getDb()
    .collection("tenantMembers")
    .doc(memberId)
    .set(serializeDates({ userId, updatedAt: now }), { merge: true });
}

async function firestoreDeleteMember(memberId: string) {
  await getDb().collection("tenantMembers").doc(memberId).delete();
}

async function firestoreCountAccounts(tenantId: string) {
  const snap = await getDb().collection("accounts").get();
  return snap.docs.filter((doc) => {
    const data = doc.data();
    const docTenant = data.tenantId as string | undefined;
    if (!docTenant) return true;
    return docTenant === tenantId || tenantId === "legacy-household";
  }).length;
}

async function firestoreHasUnscopedFinanceData() {
  const snap = await getDb().collection("accounts").limit(1).get();
  if (snap.empty) return false;
  const doc = snap.docs[0];
  return !doc.data().tenantId;
}

async function firestoreEnsureLegacyHouseholdOwner(userId: string, email: string) {
  const hasUnscoped = await firestoreHasUnscopedFinanceData();
  if (!hasUnscoped) return null;

  const tenantId = "legacy-household";
  const now = new Date().toISOString();
  const tenantRef = getDb().collection("tenants").doc(tenantId);
  const tenantDoc = await tenantRef.get();
  if (!tenantDoc.exists) {
    await tenantRef.set({
      name: "Jeremy & Candice Household",
      slug: "jeremy-candice",
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingByEmail = await firestoreFindMemberByEmail(email);
  if (existingByEmail) {
    await firestoreUpdateMemberUserId(existingByEmail.id, userId);
    return { tenantId, tenantName: "Jeremy & Candice Household" };
  }

  const memberId = cuid();
  await getDb()
    .collection("tenantMembers")
    .doc(memberId)
    .set(
      serializeDates({
        tenantId,
        userId,
        email: email.trim().toLowerCase(),
        role: "OWNER",
        createdAt: now,
        updatedAt: now,
      })
    );
  return { tenantId, tenantName: "Jeremy & Candice Household" };
}

async function firestoreCreateTenant(input: {
  id?: string;
  name: string;
  slug: string;
  userId: string;
  email: string;
}) {
  const tenantId = input.id ?? cuid();
  const memberId = cuid();
  const now = new Date().toISOString();
  await getDb()
    .collection("tenants")
    .doc(tenantId)
    .set(serializeDates({ name: input.name, slug: input.slug, createdAt: now, updatedAt: now }));
  await getDb()
    .collection("tenantMembers")
    .doc(memberId)
    .set(
      serializeDates({
        tenantId,
        userId: input.userId,
        email: input.email,
        role: "OWNER",
        createdAt: now,
        updatedAt: now,
      })
    );
  return { id: tenantId, name: input.name, slug: input.slug };
}

export async function findMemberByUserId(userId: string) {
  if (isFirebaseProduction()) {
    return firestoreFindMemberByUserId(userId);
  }
  return rawDb.tenantMember.findUnique({ where: { userId } });
}

export async function findTenantById(id: string) {
  if (isFirebaseProduction()) {
    return firestoreFindTenantById(id);
  }
  return rawDb.tenant.findUnique({ where: { id } });
}

export async function findTenantBySlug(slug: string) {
  if (isFirebaseProduction()) {
    return firestoreFindTenantBySlug(slug);
  }
  return rawDb.tenant.findUnique({ where: { slug } });
}

export async function createTenantForUser(userId: string, email: string, opts?: { id?: string; name?: string; slug?: string }) {
  if (isFirebaseProduction()) {
    const localPart = email.split("@")[0] ?? "user";
    let slug = opts?.slug ?? slugify(localPart);
    let suffix = 0;
    while (await firestoreFindTenantBySlug(slug)) {
      suffix += 1;
      slug = `${slugify(localPart)}-${suffix}`;
    }
    return firestoreCreateTenant({
      id: opts?.id,
      name: opts?.name ?? `${localPart}'s Workspace`,
      slug,
      userId,
      email,
    });
  }

  const localPart = email.split("@")[0] ?? "user";
  let slug = opts?.slug ?? slugify(localPart);
  let suffix = 0;
  while (await rawDb.tenant.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugify(localPart)}-${suffix}`;
  }

  return rawDb.tenant.create({
    data: {
      id: opts?.id,
      name: opts?.name ?? `${localPart}'s Workspace`,
      slug,
      members: {
        create: {
          userId,
          email,
          role: "OWNER",
        },
      },
    },
  });
}

export async function ensureDevTenant(
  tenantId: string,
  userId: string,
  email: string,
  name: string
) {
  const existing = await findTenantById(tenantId);
  if (existing) {
    return { tenantId: existing.id, tenantName: existing.name };
  }
  const created = await createTenantForUser(userId, email, {
    id: tenantId,
    name,
    slug: "dev",
  });
  return { tenantId: created.id, tenantName: created.name };
}

export async function findMemberByEmail(email: string) {
  if (isFirebaseProduction()) {
    return firestoreFindMemberByEmail(email);
  }
  return rawDb.tenantMember.findFirst({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function updateMemberUserId(memberId: string, userId: string) {
  if (isFirebaseProduction()) {
    return firestoreUpdateMemberUserId(memberId, userId);
  }
  return rawDb.tenantMember.update({
    where: { id: memberId },
    data: { userId },
  });
}

export async function deleteMemberById(memberId: string) {
  if (isFirebaseProduction()) {
    return firestoreDeleteMember(memberId);
  }
  return rawDb.tenantMember.delete({ where: { id: memberId } });
}

async function firestoreUpdateMemberEmail(userId: string, email: string) {
  const snap = await getDb()
    .collection("tenantMembers")
    .where("userId", "==", userId)
    .limit(1)
    .get();
  if (snap.empty) return;
  const doc = snap.docs[0];
  const now = new Date().toISOString();
  await doc.ref.set(
    serializeDates({ email: email.trim().toLowerCase(), updatedAt: now }),
    { merge: true }
  );
}

export async function syncMemberEmail(userId: string, email: string) {
  if (isFirebaseProduction()) {
    return firestoreUpdateMemberEmail(userId, email);
  }
  const member = await rawDb.tenantMember.findUnique({ where: { userId } });
  if (!member) return;
  await rawDb.tenantMember.update({
    where: { id: member.id },
    data: { email: email.trim().toLowerCase() },
  });
}

export async function tenantHasFinanceData(tenantId: string) {
  if (isFirebaseProduction()) {
    return (await firestoreCountAccounts(tenantId)) > 0;
  }
  const count = await rawDb.account.count({ where: { tenantId } });
  return count > 0;
}

export async function ensureLegacyHouseholdOwner(userId: string, email: string) {
  if (isFirebaseProduction()) {
    return firestoreEnsureLegacyHouseholdOwner(userId, email);
  }
  return null;
}
