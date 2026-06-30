import type { Metadata } from "next";
import { getPaycheckPlannerData } from "@/lib/paycheck-planner-service";
import { PaycheckPlannerPageClient } from "@/components/paycheck-planner-page-client";

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

  return <PaycheckPlannerPageClient initialData={data} accounts={data.accounts} />;
}
