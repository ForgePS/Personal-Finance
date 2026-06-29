import type { Metadata } from "next";
import { getEnvelopeData } from "@/lib/envelope-service";
import { EnvelopesPageClient } from "@/components/envelopes-page-client";

export const metadata: Metadata = {
  title: "Envelopes | Money Command",
  description: "Envelope budgeting — separate your money into expense categories",
};

export const dynamic = "force-dynamic";

export default async function EnvelopesPage() {
  const data = await getEnvelopeData();

  return (
    <EnvelopesPageClient
      month={data.month.toISOString()}
      pool={data.pool}
      envelopes={data.envelopes}
      recentTransfers={data.recentTransfers.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      }))}
      overspentCount={data.overspentCount}
    />
  );
}
