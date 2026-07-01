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
