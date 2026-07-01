import { AsyncLocalStorage } from "async_hooks";

export type TenantContext = {
  tenantId: string;
  userId: string;
  email: string;
};

const storage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function getTenantId(): string {
  const ctx = storage.getStore();
  if (!ctx?.tenantId) {
    throw new Error("No tenant context — authenticate and run inside runWithTenant()");
  }
  return ctx.tenantId;
}

export function getTenantIdOrNull(): string | null {
  return storage.getStore()?.tenantId ?? null;
}

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithTenantAsync<T>(
  ctx: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(ctx, fn);
}
