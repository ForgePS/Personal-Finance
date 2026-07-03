import { db } from "@/lib/db";

export interface CategorySuggestionInput {
  description: string;
  merchant?: string | null;
  amount: number;
  accountId?: string;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName?: string;
  confidence: "high" | "medium";
  matchKey: string;
  matchCount: number;
}

interface IndexedTransaction {
  merchant: string | null;
  description: string;
  categoryId: string;
  amount: number;
  date: Date;
  debtAccountId?: string | null;
}

interface CategoryIndex {
  merchantVotes: Map<string, Map<string, number>>;
  descriptionVotes: Map<string, Map<string, number>>;
  categoryTypes: Map<string, "INCOME" | "EXPENSE">;
  builtAt: number;
}

const CACHE_TTL_MS = 60_000;
let cachedIndex: CategoryIndex | null = null;

const STRIP_PREFIXES = [
  /^pos\s+/i,
  /^ach\s+/i,
  /^debit\s+/i,
  /^credit\s+/i,
  /^check\s+/i,
  /^sq\s*\*/i,
  /^paypal\s*\*/i,
];

export function normalizeMatchKey(value: string): string {
  let key = value
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const pattern of STRIP_PREFIXES) {
    key = key.replace(pattern, "").trim();
  }

  return key;
}

function expectedCategoryType(amount: number): "INCOME" | "EXPENSE" {
  return amount > 0 ? "INCOME" : "EXPENSE";
}

function addVote(
  map: Map<string, Map<string, number>>,
  key: string,
  categoryId: string,
  weight = 1
) {
  if (!key) return;
  const bucket = map.get(key) ?? new Map<string, number>();
  bucket.set(categoryId, (bucket.get(categoryId) ?? 0) + weight);
  map.set(key, bucket);
}

function pickBestCategory(
  votes: Map<string, number> | undefined,
  categoryTypes: Map<string, "INCOME" | "EXPENSE">,
  expectedType: "INCOME" | "EXPENSE"
): { categoryId: string; count: number } | null {
  if (!votes || votes.size === 0) return null;

  let best: { categoryId: string; count: number } | null = null;
  for (const [categoryId, count] of votes) {
    if (categoryTypes.get(categoryId) !== expectedType) continue;
    if (!best || count > best.count) {
      best = { categoryId, count };
    }
  }
  return best;
}

async function buildCategoryIndex(): Promise<CategoryIndex> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndex.builtAt < CACHE_TTL_MS) {
    return cachedIndex;
  }

  const [transactions, categories] = await Promise.all([
    db.transaction.findMany({
      where: { isTransfer: false },
      orderBy: { date: "desc" },
    }),
    db.category.findMany(),
  ]);

  const categoryTypes = new Map(
    categories.map((c) => [c.id, c.type as "INCOME" | "EXPENSE"])
  );

  const merchantVotes = new Map<string, Map<string, number>>();
  const descriptionVotes = new Map<string, Map<string, number>>();

  for (const raw of transactions as IndexedTransaction[]) {
    if (!raw.categoryId || raw.debtAccountId) continue;
    if (!categoryTypes.has(raw.categoryId)) continue;

    const merchantKey = raw.merchant ? normalizeMatchKey(raw.merchant) : "";
    const descriptionKey = normalizeMatchKey(raw.description);

    if (merchantKey) {
      addVote(merchantVotes, merchantKey, raw.categoryId, 3);
    }
    if (descriptionKey) {
      addVote(descriptionVotes, descriptionKey, raw.categoryId, 1);
    }
  }

  cachedIndex = {
    merchantVotes,
    descriptionVotes,
    categoryTypes,
    builtAt: now,
  };
  return cachedIndex;
}

export function invalidateCategoryIndexCache() {
  cachedIndex = null;
}

export async function suggestCategoryFromHistory(
  input: CategorySuggestionInput
): Promise<CategorySuggestion | null> {
  if (!input.description?.trim()) return null;

  const index = await buildCategoryIndex();
  const expectedType = expectedCategoryType(input.amount);

  const merchantKey = input.merchant ? normalizeMatchKey(input.merchant) : "";
  const descriptionKey = normalizeMatchKey(input.description);

  const merchantMatch = merchantKey
    ? pickBestCategory(index.merchantVotes.get(merchantKey), index.categoryTypes, expectedType)
    : null;
  if (merchantMatch && merchantMatch.count >= 1) {
    return {
      categoryId: merchantMatch.categoryId,
      confidence: merchantMatch.count >= 2 ? "high" : "medium",
      matchKey: merchantKey,
      matchCount: merchantMatch.count,
    };
  }

  const descriptionMatch = descriptionKey
    ? pickBestCategory(index.descriptionVotes.get(descriptionKey), index.categoryTypes, expectedType)
    : null;
  if (descriptionMatch && descriptionMatch.count >= 1) {
    return {
      categoryId: descriptionMatch.categoryId,
      confidence: descriptionMatch.count >= 2 ? "high" : "medium",
      matchKey: descriptionKey,
      matchCount: descriptionMatch.count,
    };
  }

  const partialMerchant = findPartialMerchantMatch(
    merchantKey || descriptionKey,
    index,
    expectedType
  );
  if (partialMerchant) return partialMerchant;

  return null;
}

function findPartialMerchantMatch(
  queryKey: string,
  index: CategoryIndex,
  expectedType: "INCOME" | "EXPENSE"
): CategorySuggestion | null {
  if (!queryKey || queryKey.length < 4) return null;

  let best: CategorySuggestion | null = null;

  for (const [key, votes] of index.merchantVotes) {
    if (key.length < 4) continue;
    const contains =
      queryKey.includes(key) || key.includes(queryKey);
    if (!contains) continue;

    const match = pickBestCategory(votes, index.categoryTypes, expectedType);
    if (!match || match.count < 2) continue;

    const score = match.count + (queryKey === key ? 10 : 0);
    if (!best || score > best.matchCount) {
      best = {
        categoryId: match.categoryId,
        confidence: match.count >= 3 ? "high" : "medium",
        matchKey: key,
        matchCount: score,
      };
    }
  }

  return best;
}

export async function autoCategorizeUncategorized(options?: {
  limit?: number;
  transactionIds?: string[];
}): Promise<{ applied: number; skipped: number }> {
  const limit = options?.limit ?? 500;

  let transactions = await db.transaction.findMany({
    where: { isTransfer: false },
    orderBy: { date: "desc" },
  });

  if (options?.transactionIds?.length) {
    const idSet = new Set(options.transactionIds);
    transactions = transactions.filter((t) => idSet.has(t.id));
  }

  let applied = 0;
  let skipped = 0;

  for (const tx of transactions) {
    if (applied >= limit) break;
    if (tx.categoryId || tx.debtAccountId) {
      skipped++;
      continue;
    }

    const suggestion = await suggestCategoryFromHistory({
      description: tx.description,
      merchant: tx.merchant,
      amount: tx.amount,
      accountId: tx.accountId,
    });

    if (!suggestion) {
      skipped++;
      continue;
    }

    await db.transaction.update({
      where: { id: tx.id },
      data: { categoryId: suggestion.categoryId },
    });
    applied++;
  }

  if (applied > 0) {
    invalidateCategoryIndexCache();
  }

  return { applied, skipped };
}

export async function enrichSuggestionWithName(
  suggestion: CategorySuggestion
): Promise<CategorySuggestion> {
  const category = await db.category.findUnique({ where: { id: suggestion.categoryId } });
  return {
    ...suggestion,
    categoryName: category?.name,
  };
}
