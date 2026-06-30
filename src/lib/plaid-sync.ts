import { db } from "@/lib/db";
import {
  convertPlaidAmount,
  getPlaidClient,
  mapPlaidAccountIcon,
  mapPlaidAccountType,
} from "@/lib/plaid";
import { ACCOUNT_COLORS } from "@/lib/constants";
import { isLiability } from "@/lib/constants";

export async function syncPlaidItem(plaidItemRecordId: string) {
  const item = await db.plaidItem.findUnique({
    where: { id: plaidItemRecordId },
    include: { accounts: true },
  });

  if (!item) throw new Error("Bank connection not found");

  const plaid = await getPlaidClient();

  const accountsResponse = await plaid.accountsGet({
    access_token: item.accessToken,
  });

  const accountMap = new Map(item.accounts.map((a) => [a.plaidAccountId, a]));
  let colorIndex = 0;

  for (const plaidAccount of accountsResponse.data.accounts) {
    const type = mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype);
    const balance =
      plaidAccount.balances.current ??
      plaidAccount.balances.available ??
      0;

    const accountBalance = isLiability(type) ? -Math.abs(balance) : balance;

    const existing = accountMap.get(plaidAccount.account_id);
    if (existing) {
      await db.account.update({
        where: { id: existing.id },
        data: {
          type,
          balance: accountBalance,
          mask: plaidAccount.mask,
          lastSyncedAt: new Date(),
        },
      });
    } else {
      await db.account.create({
        data: {
          name: plaidAccount.name,
          type,
          institution: item.institutionName,
          balance: accountBalance,
          color: ACCOUNT_COLORS[colorIndex % ACCOUNT_COLORS.length],
          icon: mapPlaidAccountIcon(type),
          isLinked: true,
          isArchived: false,
          plaidAccountId: plaidAccount.account_id,
          plaidItemId: item.id,
          mask: plaidAccount.mask,
          lastSyncedAt: new Date(),
        },
      });
      colorIndex++;
    }
  }

  const allAccounts = await db.account.findMany({
    where: { plaidItemId: item.id },
  });

  let cursor = item.transactionsCursor ?? undefined;
  let hasMore = true;
  let added = 0;

  while (hasMore) {
    const syncResponse = await plaid.transactionsSync({
      access_token: item.accessToken,
      cursor,
    });

    const { added: addedTxs, modified, removed, next_cursor, has_more } =
      syncResponse.data;

    for (const tx of [...addedTxs, ...modified]) {
      const account = allAccounts.find((a) => a.plaidAccountId === tx.account_id);
      if (!account) continue;

      const amount = convertPlaidAmount(tx.amount);
      const description = tx.merchant_name || tx.name;
      const merchant = tx.merchant_name || null;

      await db.transaction.upsert({
        where: { plaidTransactionId: tx.transaction_id },
        update: {
          amount,
          description,
          merchant,
          date: new Date(tx.date),
        },
        create: {
          accountId: account.id,
          plaidTransactionId: tx.transaction_id,
          amount,
          description,
          merchant,
          date: new Date(tx.date),
          isTransfer: tx.personal_finance_category?.primary === "TRANSFER",
        },
      });
      added++;
    }

    for (const removedTx of removed) {
      await db.transaction.deleteMany({
        where: { plaidTransactionId: removedTx.transaction_id },
      });
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  await db.plaidItem.update({
    where: { id: item.id },
    data: {
      transactionsCursor: cursor,
      lastSyncedAt: new Date(),
    },
  });

  return { accountsSynced: allAccounts.length, transactionsSynced: added };
}

export async function getConnectedBanks() {
  return db.plaidItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accounts: {
        where: { isArchived: false },
        select: {
          id: true,
          name: true,
          mask: true,
          balance: true,
          type: true,
          lastSyncedAt: true,
        },
      },
    },
  });
}

export interface AvailableSyncedAccount {
  id: string;
  plaidAccountId: string;
  plaidItemId: string;
  existingAccountId: string | null;
  name: string;
  mask: string | null;
  type: string;
  balance: number;
  institutionName: string;
}

export async function getAvailableSyncedAccounts(): Promise<AvailableSyncedAccount[]> {
  const items = await db.plaidItem.findMany({ orderBy: { createdAt: "desc" } });
  if (items.length === 0) return [];

  const plaid = await getPlaidClient();
  const available: AvailableSyncedAccount[] = [];

  for (const item of items) {
    const response = await plaid.accountsGet({ access_token: item.accessToken });
    const dbAccounts = await db.account.findMany({ where: { plaidItemId: item.id } });
    const byPlaidId = new Map(
      dbAccounts
        .filter((account) => account.plaidAccountId)
        .map((account) => [account.plaidAccountId as string, account])
    );

    for (const plaidAccount of response.data.accounts) {
      const existing = byPlaidId.get(plaidAccount.account_id);
      if (existing && existing.isArchived !== true) continue;

      const type = mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype);
      const balance =
        plaidAccount.balances.current ?? plaidAccount.balances.available ?? 0;
      const accountBalance = isLiability(type) ? -Math.abs(balance) : balance;

      available.push({
        id: existing?.id ?? plaidAccount.account_id,
        plaidAccountId: plaidAccount.account_id,
        plaidItemId: item.id,
        existingAccountId: existing?.id ?? null,
        name: plaidAccount.name,
        mask: plaidAccount.mask ?? null,
        type,
        balance: accountBalance,
        institutionName: item.institutionName || "Connected Bank",
      });
    }
  }

  return available;
}

export async function importSyncedAccount(
  plaidAccountId: string,
  plaidItemId: string,
  customName?: string | null
) {
  const item = await db.plaidItem.findUnique({ where: { id: plaidItemId } });
  if (!item) throw new Error("Bank connection not found");

  const plaid = await getPlaidClient();
  const response = await plaid.accountsGet({ access_token: item.accessToken });
  const plaidAccount = response.data.accounts.find(
    (account) => account.account_id === plaidAccountId
  );
  if (!plaidAccount) throw new Error("Synced account not found");

  const type = mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype);
  const balance =
    plaidAccount.balances.current ?? plaidAccount.balances.available ?? 0;
  const accountBalance = isLiability(type) ? -Math.abs(balance) : balance;

  const displayName = customName?.trim() || plaidAccount.name;

  const existing = await db.account.findFirst({ where: { plaidAccountId } });
  if (existing) {
    return db.account.update({
      where: { id: existing.id },
      data: {
        ...(customName?.trim() ? { name: customName.trim() } : {}),
        type,
        institution: item.institutionName,
        balance: accountBalance,
        mask: plaidAccount.mask,
        isArchived: false,
        isLinked: true,
        plaidItemId: item.id,
        lastSyncedAt: new Date(),
      },
    });
  }

  return db.account.create({
    data: {
      name: displayName,
      type,
      institution: item.institutionName,
      balance: accountBalance,
      color: ACCOUNT_COLORS[0],
      icon: mapPlaidAccountIcon(type),
      isLinked: true,
      isArchived: false,
      plaidAccountId,
      plaidItemId: item.id,
      mask: plaidAccount.mask,
      lastSyncedAt: new Date(),
    },
  });
}

export async function disconnectBank(plaidItemRecordId: string) {
  const item = await db.plaidItem.findUnique({
    where: { id: plaidItemRecordId },
  });
  if (!item) throw new Error("Bank connection not found");

  try {
    const plaid = await getPlaidClient();
    await plaid.itemRemove({ access_token: item.accessToken });
  } catch {
    // Item may already be removed on Plaid's side
  }

  await db.account.updateMany({
    where: { plaidItemId: item.id },
    data: { isArchived: true, isLinked: false },
  });

  await db.plaidItem.delete({ where: { id: item.id } });
}
