import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isPostgresUrl(url?: string) {
  return url?.startsWith("postgresql://") || url?.startsWith("postgres://");
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  // Google Cloud SQL (PostgreSQL) — used on Cloud Run
  if (isPostgresUrl(databaseUrl)) {
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }

  // Turso (optional alternative)
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  // Local development: SQLite file
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    "envelopePool" in cached &&
    "plaidItem" in cached &&
    "paySchedule" in cached &&
    "scheduledExpense" in cached
  ) {
    return cached;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const db = getPrismaClient();
