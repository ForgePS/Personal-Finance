import type { Metadata } from "next";
import { getEnvelopeData } from "@/lib/envelope-service";
import { formatDateKey, getMonthKey, toIsoStringRequired, parseEnvelopeMonthInput } from "@/lib/utils";
import { EnvelopesPageClient } from "@/components/envelopes-page-client";

export const metadata: Metadata = {
  title: "Envelopes | Money Command",
  description: "Envelope budgeting — separate your money into expense categories",
};

export const dynamic = "force-dynamic";

export default async function EnvelopesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const monthKey = monthParam ?? getMonthKey(new Date());
  const month = parseEnvelopeMonthInput(monthKey);
  const data = await getEnvelopeData(month);

  return (
    <EnvelopesPageClient
      monthKey={getMonthKey(data.month)}
      pool={data.pool}
      envelopes={data.envelopes.map((envelope) => ({
        ...envelope,
        transactions: envelope.transactions.map((tx) => ({
          ...tx,
          date: formatDateKey(tx.date),
        })),
      }))}
      recentTransfers={data.recentTransfers.map((t) => ({
        ...t,
        createdAt: toIsoStringRequired(t.createdAt),
      }))}
      recentPoolFundings={data.recentPoolFundings.map((f) => ({
        ...f,
        createdAt: toIsoStringRequired(f.createdAt),
      }))}
      uncategorizedTransactions={data.uncategorizedTransactions.map((tx) => ({
        ...tx,
        date: formatDateKey(tx.date),
      }))}
      availableCategories={data.availableCategories}
      overspentCount={data.overspentCount}
      overBudgetCount={data.overBudgetCount}
    />
  );
}
