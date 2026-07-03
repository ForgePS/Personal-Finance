import { getDb, COLLECTIONS, toDate, serializeDates } from "./admin";
import { getTenantIdOrNull } from "../tenant-context";
import { resolveLegacyTenantId } from "../tenant-constants";
import { randomBytes } from "crypto";

const TENANT_SCOPED_COLLECTIONS = new Set<string>(
  Object.values(COLLECTIONS).filter(
    (c) =>
      c !== COLLECTIONS.tenants &&
      c !== COLLECTIONS.tenantMembers &&
      c !== COLLECTIONS.tenantInvites
  )
);

function cuid() {
  return randomBytes(12).toString("hex");
}

type WhereInput = Record<string, unknown>;
type OrderBy = Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];

function scopeWhere(where: WhereInput | undefined, collection: string): WhereInput | undefined {
  const tenantId = getTenantIdOrNull();
  if (!tenantId || !TENANT_SCOPED_COLLECTIONS.has(collection)) {
    return where;
  }
  return { ...(where ?? {}), tenantId };
}

function scopeCreateData(data: Record<string, unknown>, collection: string): Record<string, unknown> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId || !TENANT_SCOPED_COLLECTIONS.has(collection)) {
    return data;
  }
  return { ...data, tenantId };
}

async function getAll<T>(collection: string): Promise<T[]> {
  const snap = await getDb().collection(collection).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

function normalizeWhere(where: WhereInput): WhereInput {
  if ("tenantId_categoryId_month" in where) {
    const composite = where.tenantId_categoryId_month as {
      tenantId: string;
      categoryId: string;
      month: Date | string;
    };
    const month = toDate(composite.month).toISOString();
    return { tenantId: composite.tenantId, categoryId: composite.categoryId, month };
  }
  if ("categoryId_month" in where) {
    const composite = where.categoryId_month as { categoryId: string; month: Date | string };
    const month = toDate(composite.month).toISOString();
    return { categoryId: composite.categoryId, month };
  }
  if ("tenantId_month" in where) {
    const composite = where.tenantId_month as { tenantId: string; month: Date | string };
    const month = toDate(composite.month).toISOString();
    return { tenantId: composite.tenantId, month };
  }
  if ("tenantId_occurrenceKey" in where) {
    const composite = where.tenantId_occurrenceKey as { tenantId: string; occurrenceKey: string };
    return { tenantId: composite.tenantId, occurrenceKey: composite.occurrenceKey };
  }
  if ("tenantId_plaidAccountId" in where) {
    const composite = where.tenantId_plaidAccountId as { tenantId: string; plaidAccountId: string };
    return { tenantId: composite.tenantId, plaidAccountId: composite.plaidAccountId };
  }
  if ("tenantId_itemId" in where) {
    const composite = where.tenantId_itemId as { tenantId: string; itemId: string };
    return { tenantId: composite.tenantId, itemId: composite.itemId };
  }
  if ("tenantId_plaidTransactionId" in where) {
    const composite = where.tenantId_plaidTransactionId as {
      tenantId: string;
      plaidTransactionId: string;
    };
    return { tenantId: composite.tenantId, plaidTransactionId: composite.plaidTransactionId };
  }
  return where;
}

function matchesWhere(item: Record<string, unknown>, where: WhereInput): boolean {
  const normalized = normalizeWhere(where);
  for (const [key, value] of Object.entries(normalized)) {
    if (key === "OR" && Array.isArray(value)) {
      if (!value.some((clause) => matchesWhere(item, clause as WhereInput))) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(value)) {
      if (!value.every((clause) => matchesWhere(item, clause as WhereInput))) return false;
      continue;
    }
    if (typeof value === "object" && value !== null) {
      const op = value as Record<string, unknown>;

      // Date/number range comparisons. Each bound is applied independently so
      // a single-sided range (only gte, only lte, etc.) still works.
      const isDateBound = (v: unknown) => v instanceof Date || typeof v === "string";
      const compareValue = (raw: unknown) =>
        isDateBound(raw) || item[key] instanceof Date ? toDate(item[key]).getTime() : Number(item[key]);

      if ("gte" in op) {
        const bound = isDateBound(op.gte) ? toDate(op.gte).getTime() : Number(op.gte);
        if (!(compareValue(op.gte) >= bound)) return false;
      }
      if ("lte" in op) {
        const bound = isDateBound(op.lte) ? toDate(op.lte).getTime() : Number(op.lte);
        if (!(compareValue(op.lte) <= bound)) return false;
      }
      if ("gt" in op) {
        const bound = isDateBound(op.gt) ? toDate(op.gt).getTime() : Number(op.gt);
        if (!(compareValue(op.gt) > bound)) return false;
      }
      if ("lt" in op) {
        const bound = isDateBound(op.lt) ? toDate(op.lt).getTime() : Number(op.lt);
        if (!(compareValue(op.lt) < bound)) return false;
      }
      if ("in" in op && !(op.in as unknown[]).includes(item[key])) return false;
      if ("not" in op && item[key] === op.not) return false;
      if ("equals" in op && item[key] !== op.equals) return false;
      if ("contains" in op) {
        const haystack = String(item[key] ?? "").toLowerCase();
        if (!haystack.includes(String(op.contains).toLowerCase())) return false;
      }
      if ("startsWith" in op) {
        const haystack = String(item[key] ?? "").toLowerCase();
        if (!haystack.startsWith(String(op.startsWith).toLowerCase())) return false;
      }
      continue;
    }
    if (value instanceof Date) {
      if (toDate(item[key]).toISOString() !== value.toISOString()) return false;
      continue;
    }
    // Firestore docs may omit fields that Prisma defaults to false (e.g.
    // isArchived, isTransfer). A missing field must be treated as that default.
    if (value === false && (key === "isArchived" || key === "isTransfer")) {
      if (item[key] === true) return false;
      continue;
    }
    if (key === "isActive" && value === true) {
      if (item[key] === false) return false;
      continue;
    }
    if (key === "tenantId") {
      if (!resolveLegacyTenantId(item.tenantId as string | undefined, String(value))) {
        return false;
      }
      continue;
    }
    if (item[key] !== value) return false;
  }
  return true;
}

function sortItems<T extends Record<string, unknown>>(items: T[], orderBy?: OrderBy): T[] {
  if (!orderBy) return items;
  const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...items].sort((a, b) => {
    for (const rule of rules) {
      const [field, dir] = Object.entries(rule)[0];
      const av = a[field];
      const bv = b[field];
      if (av === bv) continue;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

async function findMany<T extends Record<string, unknown>>(
  collection: string,
  opts?: {
    where?: WhereInput;
    orderBy?: OrderBy;
    take?: number;
    include?: Record<string, boolean | object>;
  }
): Promise<T[]> {
  const scopedWhere = scopeWhere(opts?.where, collection);
  let items = await getAll<T>(collection);
  if (scopedWhere) items = items.filter((i) => matchesWhere(i, scopedWhere));
  items = sortItems(items, opts?.orderBy);
  if (opts?.take) items = items.slice(0, opts.take);

  if (opts?.include) {
    items = (await Promise.all(
      items.map((item) => attachIncludes(collection, item, opts.include!))
    )) as T[];
  }
  return items;
}

async function findUnique<T extends Record<string, unknown>>(
  collection: string,
  opts: { where: WhereInput; include?: Record<string, boolean | object> }
): Promise<T | null> {
  const items = await findMany<T>(collection, { where: opts.where, include: opts.include, take: 1 });
  return items[0] ?? null;
}

async function findFirst<T extends Record<string, unknown>>(
  collection: string,
  opts: { where: WhereInput; orderBy?: OrderBy; include?: Record<string, boolean | object> }
): Promise<T | null> {
  const items = await findMany<T>(collection, { ...opts, take: 1 });
  return items[0] ?? null;
}

async function create<T extends Record<string, unknown>>(
  collection: string,
  opts: { data: Record<string, unknown>; include?: Record<string, boolean | object> }
): Promise<T> {
  const id = (opts.data.id as string) || cuid();
  const now = new Date().toISOString();
  const data = serializeDates({
    ...scopeCreateData(opts.data, collection),
    id,
    createdAt: opts.data.createdAt ?? now,
    updatedAt: opts.data.updatedAt ?? now,
  });
  await getDb().collection(collection).doc(id).set(data);
  const created = { ...data, id } as unknown as T;
  if (opts.include) return attachIncludes(collection, created as Record<string, unknown>, opts.include) as Promise<T>;
  return created;
}

async function update<T extends Record<string, unknown>>(
  collection: string,
  opts: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, boolean | object> }
): Promise<T> {
  const id = opts.where.id;
  const data = serializeDates({ ...opts.data, updatedAt: new Date().toISOString() });
  await getDb().collection(collection).doc(id).update(data);
  const updated = await findUnique<T>(collection, { where: { id }, include: opts.include });
  return updated as T;
}

async function updateMany(collection: string, opts: { where: WhereInput; data: Record<string, unknown> }) {
  const items = await findMany(collection, { where: opts.where });
  await Promise.all(
    items.map((item) =>
      getDb().collection(collection).doc(item.id as string).update(serializeDates({ ...opts.data, updatedAt: new Date().toISOString() }))
    )
  );
  return { count: items.length };
}

async function deleteOne(collection: string, opts: { where: { id: string } }) {
  await getDb().collection(collection).doc(opts.where.id).delete();
}

async function deleteMany(collection: string, opts: { where: WhereInput }) {
  const items = await findMany(collection, { where: opts.where });
  await Promise.all(items.map((item) => getDb().collection(collection).doc(item.id as string).delete()));
  return { count: items.length };
}

async function upsert<T extends Record<string, unknown>>(
  collection: string,
  opts: {
    where: WhereInput;
    update: Record<string, unknown>;
    create: Record<string, unknown>;
    include?: Record<string, boolean | object>;
  }
): Promise<T> {
  const existing = await findFirst(collection, { where: scopeWhere(opts.where, collection) ?? opts.where });
  if (existing) {
    return update(collection, { where: { id: existing.id as string }, data: opts.update, include: opts.include }) as Promise<T>;
  }
  const createData = scopeCreateData({ ...opts.create, ...opts.where }, collection);
  return create(collection, { data: createData, include: opts.include }) as Promise<T>;
}

async function attachIncludes(
  collection: string,
  item: Record<string, unknown>,
  include: Record<string, boolean | object>
): Promise<Record<string, unknown>> {
  const result = { ...item };

  if (collection === COLLECTIONS.accounts) {
    if (include.transactions) {
      const txOpts = typeof include.transactions === "object" ? include.transactions as { orderBy?: OrderBy; take?: number } : {};
      result.transactions = await findMany(COLLECTIONS.transactions, {
        where: { accountId: item.id },
        orderBy: txOpts.orderBy,
        take: txOpts.take,
        include: { category: true },
      });
    }
    if (include._count) {
      const txs = await findMany(COLLECTIONS.transactions, { where: { accountId: item.id } });
      result._count = { transactions: txs.length };
    }
    if (include.plaidItem) {
      result.plaidItem = item.plaidItemId
        ? await findUnique(COLLECTIONS.plaidItems, { where: { id: item.plaidItemId } })
        : null;
    }
  }

  if (collection === COLLECTIONS.transactions) {
    if (include.category) {
      result.category = item.categoryId
        ? await findUnique(COLLECTIONS.categories, { where: { id: item.categoryId } })
        : null;
    }
    if (include.account) {
      result.account = item.accountId
        ? await findUnique(COLLECTIONS.accounts, { where: { id: item.accountId } })
        : null;
    }
    if (include.transferAccount) {
      result.transferAccount = item.transferAccountId
        ? await findUnique(COLLECTIONS.accounts, { where: { id: item.transferAccountId } })
        : null;
    }
    if (include.debtAccount) {
      result.debtAccount = item.debtAccountId
        ? await findUnique(COLLECTIONS.accounts, { where: { id: item.debtAccountId } })
        : null;
    }
  }

  if (collection === COLLECTIONS.budgets && include.category) {
    result.category = item.categoryId
      ? await findUnique(COLLECTIONS.categories, { where: { id: item.categoryId } })
      : null;
  }

  if (collection === COLLECTIONS.goals) {
    if (include.account) {
      result.account = item.accountId
        ? await findUnique(COLLECTIONS.accounts, { where: { id: item.accountId } })
        : null;
    }
  }

  if (collection === COLLECTIONS.envelopes && include.category) {
    result.category = item.categoryId
      ? await findUnique(COLLECTIONS.categories, { where: { id: item.categoryId } })
      : null;
  }

  if (collection === COLLECTIONS.envelopePoolFundings && include.account) {
    result.account = item.accountId
      ? await findUnique(COLLECTIONS.accounts, { where: { id: item.accountId } })
      : null;
  }

  if (collection === COLLECTIONS.plaidItems && include.accounts) {
    result.accounts = await findMany(COLLECTIONS.accounts, {
      where: { plaidItemId: item.id, ...(typeof include.accounts === "object" ? (include.accounts as { where?: WhereInput }).where : {}) },
    });
  }

  if (collection === COLLECTIONS.categories && include.children) {
    result.children = await findMany(COLLECTIONS.categories, { where: { parentId: item.id } });
  }

  if (
    (collection === COLLECTIONS.paySchedules || collection === COLLECTIONS.scheduledExpenses) &&
    include
  ) {
    if (include.category) {
      result.category = item.categoryId
        ? await findUnique(COLLECTIONS.categories, { where: { id: item.categoryId } })
        : null;
    }
    if (include.account) {
      result.account = item.accountId
        ? await findUnique(COLLECTIONS.accounts, { where: { id: item.accountId } })
        : null;
    }
  }

  return result;
}

async function runTransaction(ops: Promise<unknown>[]) {
  for (const op of ops) await op;
}

function makeModel(collection: string) {
  return {
    findMany: (opts?: Parameters<typeof findMany>[1]) => findMany(collection, opts),
    findUnique: (opts: Parameters<typeof findUnique>[1]) => findUnique(collection, opts),
    findFirst: (opts: Parameters<typeof findFirst>[1]) => findFirst(collection, opts),
    create: (opts: Parameters<typeof create>[1]) => create(collection, opts),
    update: (opts: Parameters<typeof update>[1]) => update(collection, opts),
    updateMany: (opts: Parameters<typeof updateMany>[1]) => updateMany(collection, opts),
    delete: (opts: { where: { id: string } }) => deleteOne(collection, opts),
    deleteMany: (opts: { where: WhereInput }) => deleteMany(collection, opts),
    upsert: (opts: Parameters<typeof upsert>[1]) => upsert(collection, opts),
  };
}

export const db = {
  account: makeModel(COLLECTIONS.accounts),
  category: makeModel(COLLECTIONS.categories),
  transaction: makeModel(COLLECTIONS.transactions),
  budget: makeModel(COLLECTIONS.budgets),
  goal: makeModel(COLLECTIONS.goals),
  envelopePool: makeModel(COLLECTIONS.envelopePools),
  envelope: makeModel(COLLECTIONS.envelopes),
  envelopeTransfer: makeModel(COLLECTIONS.envelopeTransfers),
  envelopePoolFunding: makeModel(COLLECTIONS.envelopePoolFundings),
  plaidItem: makeModel(COLLECTIONS.plaidItems),
  paySchedule: makeModel(COLLECTIONS.paySchedules),
  scheduledExpense: makeModel(COLLECTIONS.scheduledExpenses),
  scheduleDateAdjustment: makeModel(COLLECTIONS.scheduleDateAdjustments),
  $transaction: runTransaction,
};
