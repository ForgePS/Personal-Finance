import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { createTenantScopedPrisma } from "./tenant-scoped-prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  rawPrisma: PrismaClient | undefined;
};

function isPostgresUrl(url?: string) {
  return url?.startsWith("postgresql://") || url?.startsWith("postgres://");
}

function createRawPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (isPostgresUrl(databaseUrl)) {
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }

  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

function getRawPrismaClient() {
  if (globalForPrisma.rawPrisma) {
    return globalForPrisma.rawPrisma;
  }
  const client = createRawPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.rawPrisma = client;
  }
  return client;
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && "tenant" in cached && "tenantMember" in cached) {
    return cached;
  }
  const client = createTenantScopedPrisma(getRawPrismaClient());
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const rawDb = getRawPrismaClient();
export const db = getPrismaClient();
