import { db as prismaDb } from "./db-prisma";
import { isFirebaseProduction } from "./firebase/admin";
import * as firestore from "./firebase/store";

type PrismaDb = typeof prismaDb;
type FirestoreDb = typeof firestore.db;

function getStore(): PrismaDb | FirestoreDb {
  if (isFirebaseProduction()) {
    return firestore.db;
  }
  return prismaDb;
}

export const db = new Proxy({} as PrismaDb, {
  get(_target, prop) {
    const store = getStore();
    return Reflect.get(store, prop);
  },
});

export { isFirebaseProduction };
