/** Household ID used for migrated pre-auth Firestore data */
export const LEGACY_HOUSEHOLD_ID = "legacy-household";

/** Older builds used this alias — treat as the same household */
export const LEGACY_HOUSEHOLD_ALIASES = new Set([
  LEGACY_HOUSEHOLD_ID,
  "legacy-tenant",
]);

export function isLegacyHouseholdId(tenantId: string | null | undefined) {
  return tenantId != null && LEGACY_HOUSEHOLD_ALIASES.has(tenantId);
}

export function resolveLegacyTenantId(
  itemTenantId: string | null | undefined,
  queryTenantId: string
) {
  const itemTenant = itemTenantId ?? LEGACY_HOUSEHOLD_ID;
  if (
    isLegacyHouseholdId(queryTenantId) &&
    (isLegacyHouseholdId(itemTenant) || itemTenantId == null)
  ) {
    return true;
  }
  return itemTenant === queryTenantId;
}
