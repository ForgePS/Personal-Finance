import type { Metadata } from "next";
import { getAnalyticsData } from "@/lib/analytics-service";
import { AnalyticsPageClient } from "@/components/analytics-page-client";
import { db } from "@/lib/db";
import { withServerAuth } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Analytics | Money Command",
  description: "Comprehensive financial analytics and expense forecasting",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  return withServerAuth(async () => {
  const params = await searchParams;
  const accountId = params.accountId === "all" ? null : params.accountId ?? null;

  const [data, accounts] = await Promise.all([
    getAnalyticsData(accountId),
    db.account.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return <AnalyticsPageClient data={data} accounts={accounts} />;
  });
}
