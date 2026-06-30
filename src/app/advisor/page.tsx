import type { Metadata } from "next";
import { getFinancialAdvisorData } from "@/lib/financial-advisor-service";
import { AdvisorPageClient } from "@/components/advisor-page-client";

export const metadata: Metadata = {
  title: "Financial Advisor | Money Command",
  description: "Personalized financial insights and recommendations",
};

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const data = await getFinancialAdvisorData();
  return <AdvisorPageClient initialData={data} />;
}
