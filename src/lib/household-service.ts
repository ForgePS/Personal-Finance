import { randomBytes } from "crypto";
import { rawDb } from "./db-prisma";
import { isFirebaseProduction } from "./firebase/admin";
import { getDb, serializeDates } from "./firebase/admin";
import {
  createTenantForUser,
  ensureDevTenant,
  ensureLegacyHouseholdOwner,
  findMemberByEmail,
  findMemberByUserId,
  findTenantById,
  deleteMemberById,
  tenantHasFinanceData,
  updateMemberUserId,
} from "./tenant-repository";
import { isLegacyHouseholdId } from "./tenant-constants";

export type { TenantMemberRole } from "@/generated/prisma/client";

const INVITE_TTL_DAYS = 7;

function cuid() {
  return randomBytes(12).toString("hex");
}

function inviteToken() {
  return randomBytes(24).toString("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function inviteExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_TTL_DAYS);
  return date;
}

type TenantMemberRecord = {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  role: string;
};

type TenantInviteRecord = {
  id: string;
  tenantId: string;
  email: string;
  token: string;
  invitedByUserId: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
};

async function firestoreListMembers(tenantId: string) {
  const snap = await getDb()
    .collection("tenantMembers")
    .where("tenantId", "==", tenantId)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TenantMemberRecord[];
}

async function firestoreListInvites(tenantId: string) {
  const snap = await getDb()
    .collection("tenantInvites")
    .where("tenantId", "==", tenantId)
    .where("status", "==", "PENDING")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TenantInviteRecord[];
}

async function firestoreFindInviteByToken(token: string) {
  const snap = await getDb()
    .collection("tenantInvites")
    .where("token", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as TenantInviteRecord;
}

async function firestoreFindPendingInviteByEmail(email: string) {
  const snap = await getDb()
    .collection("tenantInvites")
    .where("email", "==", normalizeEmail(email))
    .where("status", "==", "PENDING")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as TenantInviteRecord;
}

async function firestoreCreateInvite(input: {
  tenantId: string;
  email: string;
  invitedByUserId: string;
  role?: string;
}) {
  const id = cuid();
  const token = inviteToken();
  const now = new Date().toISOString();
  const expiresAt = inviteExpiresAt().toISOString();
  const record = serializeDates({
    tenantId: input.tenantId,
    email: normalizeEmail(input.email),
    token,
    invitedByUserId: input.invitedByUserId,
    role: input.role ?? "MEMBER",
    status: "PENDING",
    expiresAt,
    createdAt: now,
  });
  await getDb().collection("tenantInvites").doc(id).set(record);
  return { id, ...record } as TenantInviteRecord;
}

async function firestoreAddMember(input: {
  tenantId: string;
  userId: string;
  email: string;
  role?: string;
}) {
  const id = cuid();
  const now = new Date().toISOString();
  await getDb()
    .collection("tenantMembers")
    .doc(id)
    .set(
      serializeDates({
        tenantId: input.tenantId,
        userId: input.userId,
        email: normalizeEmail(input.email),
        role: input.role ?? "MEMBER",
        createdAt: now,
        updatedAt: now,
      })
    );
  return { id, ...input };
}

async function firestoreUpdateInvite(
  id: string,
  data: Partial<{ status: string; acceptedAt: string }>
) {
  await getDb()
    .collection("tenantInvites")
    .doc(id)
    .set(serializeDates(data), { merge: true });
}

async function firestoreDeleteMember(id: string) {
  await getDb().collection("tenantMembers").doc(id).delete();
}

async function firestoreCountTenantFinanceRecords(tenantId: string) {
  const collections = [
    "accounts",
    "transactions",
    "categories",
    "plaidItems",
    "goals",
    "budgets",
  ];
  let total = 0;
  for (const name of collections) {
    const snap = await getDb().collection(name).where("tenantId", "==", tenantId).limit(1).get();
    if (!snap.empty) total += 1;
  }
  return total;
}

export async function listTenantMembers(tenantId: string) {
  if (isFirebaseProduction()) {
    return firestoreListMembers(tenantId);
  }
  return rawDb.tenantMember.findMany({ where: { tenantId } });
}

export async function listPendingInvites(tenantId: string) {
  if (isFirebaseProduction()) {
    return firestoreListInvites(tenantId);
  }
  return rawDb.tenantInvite.findMany({
    where: { tenantId, status: "PENDING" },
  });
}

export async function findPendingInviteByEmail(email: string) {
  if (isFirebaseProduction()) {
    return firestoreFindPendingInviteByEmail(email);
  }
  return rawDb.tenantInvite.findFirst({
    where: { email: normalizeEmail(email), status: "PENDING" },
  });
}

export async function createHouseholdInvite(input: {
  tenantId: string;
  email: string;
  invitedByUserId: string;
}) {
  const email = normalizeEmail(input.email);

  const existingMember = isFirebaseProduction()
    ? (await firestoreListMembers(input.tenantId)).find((m) => m.email === email)
    : await rawDb.tenantMember.findFirst({ where: { tenantId: input.tenantId, email } });
  if (existingMember) {
    throw new Error("This person is already a member of your household");
  }

  const pending = isFirebaseProduction()
    ? (await firestoreListInvites(input.tenantId)).find((i) => i.email === email)
    : await rawDb.tenantInvite.findFirst({
        where: { tenantId: input.tenantId, email, status: "PENDING" },
      });
  if (pending) {
    throw new Error("An invite is already pending for this email");
  }

  if (isFirebaseProduction()) {
    return firestoreCreateInvite(input);
  }

  return rawDb.tenantInvite.create({
    data: {
      tenantId: input.tenantId,
      email,
      token: inviteToken(),
      invitedByUserId: input.invitedByUserId,
      role: "MEMBER",
      status: "PENDING",
      expiresAt: inviteExpiresAt(),
    },
  });
}

export async function revokeHouseholdInvite(inviteId: string, tenantId: string) {
  if (isFirebaseProduction()) {
    const doc = await getDb().collection("tenantInvites").doc(inviteId).get();
    if (!doc.exists || doc.data()?.tenantId !== tenantId) {
      throw new Error("Invite not found");
    }
    await firestoreUpdateInvite(inviteId, { status: "REVOKED" });
    return;
  }

  const invite = await rawDb.tenantInvite.findFirst({ where: { id: inviteId, tenantId } });
  if (!invite) throw new Error("Invite not found");
  await rawDb.tenantInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
}

export async function acceptHouseholdInvite(token: string, userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);

  const invite = isFirebaseProduction()
    ? await firestoreFindInviteByToken(token)
    : await rawDb.tenantInvite.findUnique({ where: { token } });

  if (!invite || invite.status !== "PENDING") {
    throw new Error("Invite not found or no longer valid");
  }

  const expiresAt = new Date(invite.expiresAt);
  if (expiresAt.getTime() < Date.now()) {
    throw new Error("This invite has expired");
  }

  if (normalizeEmail(invite.email) !== normalizedEmail) {
    throw new Error("This invite was sent to a different email address");
  }

  const existingMember = await findMemberByUserId(userId);
  if (existingMember?.tenantId === invite.tenantId) {
    if (isFirebaseProduction()) {
      await firestoreUpdateInvite(invite.id, {
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
      });
    } else {
      await rawDb.tenantInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
    }
    const tenant = await findTenantById(invite.tenantId);
    return { tenantId: invite.tenantId, tenantName: tenant?.name ?? "Household" };
  }

  if (existingMember && existingMember.tenantId !== invite.tenantId) {
    const hasData = isFirebaseProduction()
      ? (await firestoreCountTenantFinanceRecords(existingMember.tenantId)) > 0
      : (await rawDb.account.count({ where: { tenantId: existingMember.tenantId } })) > 0 ||
        (await rawDb.transaction.count({ where: { tenantId: existingMember.tenantId } })) > 0;

    if (hasData) {
      throw new Error(
        "You already belong to a household with financial data. Sign in with a new account to accept this invite."
      );
    }

    if (isFirebaseProduction()) {
      await firestoreDeleteMember(existingMember.id);
    } else {
      await rawDb.tenantMember.delete({ where: { id: existingMember.id } });
    }
  }

  if (isFirebaseProduction()) {
    await firestoreAddMember({
      tenantId: invite.tenantId,
      userId,
      email: normalizedEmail,
      role: invite.role,
    });
    await firestoreUpdateInvite(invite.id, {
      status: "ACCEPTED",
      acceptedAt: new Date().toISOString(),
    });
  } else {
    await rawDb.tenantMember.create({
      data: {
        tenantId: invite.tenantId,
        userId,
        email: normalizedEmail,
        role: invite.role as "OWNER" | "ADMIN" | "MEMBER",
      },
    });
    await rawDb.tenantInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  }

  const tenant = await findTenantById(invite.tenantId);
  return { tenantId: invite.tenantId, tenantName: tenant?.name ?? "Household" };
}

export async function joinHouseholdFromPendingInvite(userId: string, email: string) {
  const invite = await findPendingInviteByEmail(email);
  if (!invite) return null;

  const expiresAt = new Date(invite.expiresAt);
  if (expiresAt.getTime() < Date.now()) return null;

  return acceptHouseholdInvite(invite.token, userId, email);
}

export async function removeHouseholdMember(
  memberId: string,
  tenantId: string,
  requestingUserId: string
) {
  const members = await listTenantMembers(tenantId);
  const requester = members.find((m) => m.userId === requestingUserId);
  const target = members.find((m) => m.id === memberId);

  if (!requester || !target) throw new Error("Member not found");
  if (requester.role !== "OWNER" && requester.role !== "ADMIN") {
    throw new Error("Only owners and admins can remove members");
  }
  if (target.role === "OWNER") {
    throw new Error("Cannot remove the household owner");
  }
  if (target.userId === requestingUserId) {
    throw new Error("Use leave household to remove yourself");
  }

  if (isFirebaseProduction()) {
    await firestoreDeleteMember(memberId);
  } else {
    await rawDb.tenantMember.delete({ where: { id: memberId } });
  }
}

export async function claimHouseholdByEmail(
  userId: string,
  email: string
): Promise<{ tenantId: string; tenantName: string } | null> {
  const memberByEmail = await findMemberByEmail(email);
  if (memberByEmail) {
    await updateMemberUserId(memberByEmail.id, userId);

    const staleMember = await findMemberByUserId(userId);
    if (staleMember && staleMember.id !== memberByEmail.id) {
      const staleHasData = await tenantHasFinanceData(staleMember.tenantId);
      if (!staleHasData) {
        await deleteMemberById(staleMember.id);
      }
    }

    const tenant = await findTenantById(memberByEmail.tenantId);
    return {
      tenantId: memberByEmail.tenantId,
      tenantName: tenant?.name ?? "Household",
    };
  }

  return ensureLegacyHouseholdOwner(userId, email);
}

export async function resolveOrCreateHousehold(
  userId: string,
  email: string
): Promise<{ tenantId: string; tenantName: string }> {
  if (process.env.AUTH_BYPASS === "true") {
    const tenantId = process.env.DEV_TENANT_ID ?? "seed-tenant";
    return ensureDevTenant(tenantId, userId, email, "Development Workspace");
  }

  const existingMember = await findMemberByUserId(userId);
  if (existingMember) {
    const hasData =
      isLegacyHouseholdId(existingMember.tenantId) ||
      (await tenantHasFinanceData(existingMember.tenantId));

    if (hasData) {
      const tenant = await findTenantById(existingMember.tenantId);
      return {
        tenantId: existingMember.tenantId,
        tenantName: tenant?.name ?? "Household",
      };
    }

    const claimed = await claimHouseholdByEmail(userId, email);
    if (claimed) return claimed;
  }

  const joined = await joinHouseholdFromPendingInvite(userId, email);
  if (joined) return joined;

  const claimed = await claimHouseholdByEmail(userId, email);
  if (claimed) return claimed;

  if (existingMember) {
    const tenant = await findTenantById(existingMember.tenantId);
    return {
      tenantId: existingMember.tenantId,
      tenantName: tenant?.name ?? "Household",
    };
  }

  const tenant = await createTenantForUser(userId, email, {
    name: `${email.split("@")[0] ?? "My"}'s Household`,
  });
  return { tenantId: tenant.id, tenantName: tenant.name };
}
