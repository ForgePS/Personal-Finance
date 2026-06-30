import type { Metadata } from "next";
import { getPaycheckPlannerData } from "@/lib/paycheck-planner-service";
import { PaycheckPlannerPageClient } from "@/components/paycheck-planner-page-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Paycheck Planner | Money Command",
  description: "Project your balance forward and prioritize upcoming bills",
};

export const dynamic = "force-dynamic";

export default async function PaycheckPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const params = await searchParams;
  const data = await getPaycheckPlannerData(params.accountId ?? null);

  const accounts = await db.account.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, balance: true },
  });

  return (
    <PaycheckPlannerPageClient
      initialData={data}
      accounts={accounts}
    />
  );
}
