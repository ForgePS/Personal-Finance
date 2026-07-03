import type { PrismaClient } from "@/generated/prisma/client";
import { getTenantIdOrNull } from "./tenant-context";

type WhereInput = Record<string, unknown>;

const TENANT_SCOPED_MODELS = new Set([
  "Account",
  "Category",
  "Transaction",
  "Budget",
  "Goal",
  "EnvelopePool",
  "Envelope",
  "EnvelopeTransfer",
  "EnvelopePoolFunding",
  "PlaidItem",
  "PaySchedule",
  "ScheduledExpense",
  "ScheduleDateAdjustment",
]);

const COMPOUND_UNIQUE_REWRITES: Record<string, string> = {
  categoryId_month: "tenantId_categoryId_month",
  month: "tenantId_month",
  occurrenceKey: "tenantId_occurrenceKey",
  plaidAccountId: "tenantId_plaidAccountId",
  itemId: "tenantId_itemId",
  plaidTransactionId: "tenantId_plaidTransactionId",
};

const SCALAR_UNIQUE_FIELDS = new Set([
  "month",
  "occurrenceKey",
  "plaidAccountId",
  "itemId",
  "plaidTransactionId",
]);

function rewriteCompoundUniques(where: WhereInput, tenantId: string): WhereInput {
  const result: WhereInput = { ...where };

  for (const [oldKey, newKey] of Object.entries(COMPOUND_UNIQUE_REWRITES)) {
    if (!(oldKey in result)) continue;
    const value = result[oldKey];
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[newKey] = { tenantId, ...(value as Record<string, unknown>) };
    } else {
      result[newKey] = { tenantId, [oldKey]: value };
    }
    delete result[oldKey];
  }

  for (const field of SCALAR_UNIQUE_FIELDS) {
    if (field in result && !(`${field}` in COMPOUND_UNIQUE_REWRITES && false)) {
      const value = result[field];
      if (
        value !== undefined &&
        (typeof value !== "object" || value instanceof Date) &&
        !(`${`tenantId_${field}`}` in result)
      ) {
        const newKey = COMPOUND_UNIQUE_REWRITES[field];
        if (newKey) {
          result[newKey] = { tenantId, [field]: value };
          delete result[field];
        }
      }
    }
  }

  return result;
}

function scopeWhere(where: WhereInput | undefined, tenantId: string): WhereInput {
  if (!where) return { tenantId };
  return rewriteCompoundUniques({ ...where, tenantId }, tenantId);
}

function scopeData(data: unknown, tenantId: string): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => scopeData(item, tenantId));
  }
  return { ...(data as Record<string, unknown>), tenantId };
}

function scopeArgs(
  operation: string,
  args: Record<string, unknown>,
  tenantId: string
): Record<string, unknown> {
  const next = { ...args };

  if (
    operation === "create" ||
    operation === "createMany" ||
    operation === "createManyAndReturn"
  ) {
    if ("data" in next) {
      next.data = scopeData(next.data, tenantId);
    }
  }

  if (operation === "upsert" && "create" in next) {
    next.create = scopeData(next.create, tenantId);
  }

  if (
    operation === "findMany" ||
    operation === "findFirst" ||
    operation === "findUnique" ||
    operation === "update" ||
    operation === "updateMany" ||
    operation === "delete" ||
    operation === "deleteMany" ||
    operation === "upsert" ||
    operation === "count" ||
    operation === "aggregate" ||
    operation === "groupBy"
  ) {
    if ("where" in next) {
      next.where = scopeWhere(next.where as WhereInput | undefined, tenantId);
    } else if (
      operation === "findMany" ||
      operation === "count" ||
      operation === "aggregate" ||
      operation === "groupBy"
    ) {
      next.where = { tenantId };
    }
  }

  return next;
}

export function createTenantScopedPrisma(base: PrismaClient): PrismaClient {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = getTenantIdOrNull();
          if (!tenantId || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const scopedArgs = scopeArgs(operation, args as Record<string, unknown>, tenantId);

          if (operation === "findUnique" && scopedArgs.where) {
            const where = scopedArgs.where as WhereInput;
            if (where.id && Object.keys(where).length === 2 && where.tenantId) {
              const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (base as any)[modelKey].findFirst({
                ...scopedArgs,
                where,
              });
            }
          }

          return query(scopedArgs);
        },
      },
    },
  }) as unknown as PrismaClient;
}
