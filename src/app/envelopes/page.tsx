import type { Metadata } from "next";
import { getEnvelopeData } from "@/lib/envelope-service";
import { EnvelopesPageClient } from "@/components/envelopes-page-client";
import { toIsoStringRequired } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Envelopes | Money Command",
  description: "Envelope budgeting — separate your money into expense categories",
};

export const dynamic = "force-dynamic";

export default async function EnvelopesPage() {
  const data = await getEnvelopeData();

  return (
    <EnvelopesPageClient
      month={toIsoStringRequired(data.month)}
      pool={data.pool}
      envelopes={data.envelopes}
      recentTransfers={data.recentTransfers.map((t) => ({
        ...t,
        createdAt: toIsoStringRequired(t.createdAt),
      }))}
      overspentCount={data.overspentCount}
    />
  );
}
