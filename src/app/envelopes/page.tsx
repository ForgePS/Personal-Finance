import type { Metadata } from "next";
import { getEnvelopeData } from "@/lib/envelope-service";
import { EnvelopesPageClient } from "@/components/envelopes-page-client";
import { toIsoString, toIsoStringRequired } from "@/lib/utils";
import { startOfMonth } from "date-fns";

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
  const month = monthParam ? startOfMonth(new Date(`${monthParam}-01`)) : undefined;
  const data = await getEnvelopeData(month);

  return (
    <EnvelopesPageClient
      month={toIsoStringRequired(data.month)}
      pool={data.pool}
      envelopes={data.envelopes.map((envelope) => ({
        ...envelope,
        transactions: envelope.transactions.map((tx) => ({
          ...tx,
          date: toIsoStringRequired(tx.date),
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
        date: toIsoStringRequired(tx.date),
      }))}
      availableCategories={data.availableCategories}
      overspentCount={data.overspentCount}
      overBudgetCount={data.overBudgetCount}
    />
  );
}
