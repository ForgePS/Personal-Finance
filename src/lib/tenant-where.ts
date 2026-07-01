import { getTenantId } from "./tenant-context";

export function budgetUniqueWhere(categoryId: string, month: Date) {
  return {
    tenantId_categoryId_month: {
      tenantId: getTenantId(),
      categoryId,
      month,
    },
  };
}

export function envelopeUniqueWhere(categoryId: string, month: Date) {
  return {
    tenantId_categoryId_month: {
      tenantId: getTenantId(),
      categoryId,
      month,
    },
  };
}

export function envelopePoolUniqueWhere(month: Date) {
  return {
    tenantId_month: {
      tenantId: getTenantId(),
      month,
    },
  };
}

export function scheduleAdjustmentUniqueWhere(occurrenceKey: string) {
  return {
    tenantId_occurrenceKey: {
      tenantId: getTenantId(),
      occurrenceKey,
    },
  };
}

export function plaidAccountUniqueWhere(plaidAccountId: string) {
  return {
    tenantId_plaidAccountId: {
      tenantId: getTenantId(),
      plaidAccountId,
    },
  };
}

export function plaidTransactionUniqueWhere(plaidTransactionId: string) {
  return {
    tenantId_plaidTransactionId: {
      tenantId: getTenantId(),
      plaidTransactionId,
    },
  };
}

export function plaidItemUniqueWhere(itemId: string) {
  return {
    tenantId_itemId: {
      tenantId: getTenantId(),
      itemId,
    },
  };
}

export function withTenantData<T extends Record<string, unknown>>(data: T) {
  return { ...data, tenantId: getTenantId() };
}
