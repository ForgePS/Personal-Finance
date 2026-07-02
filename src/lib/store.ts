import { isFirebaseProduction } from "./firebase/admin";
import * as firestore from "./firebase/store";
import type { db as PrismaDbType } from "./db-prisma";

type PrismaDb = typeof PrismaDbType;
type FirestoreDb = typeof firestore.db;

function getPrismaStore(): PrismaDb {
  // Lazy-load SQLite/Prisma only in local dev — never on Firebase App Hosting.
  // Eager import was crashing production when better-sqlite3 tried to open dev.db.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("./db-prisma") as typeof import("./db-prisma");
  return db;
}

function getStore(): PrismaDb | FirestoreDb {
  if (isFirebaseProduction()) {
    return firestore.db;
  }
  return getPrismaStore();
}

export const db = new Proxy({} as PrismaDb, {
  get(_target, prop) {
    const store = getStore();
    return Reflect.get(store, prop);
  },
});

export { isFirebaseProduction };
