export type InsightSeverity = "critical" | "warning" | "opportunity" | "positive";
export type InsightCategory =
  | "cash_flow"
  | "liquidity"
  | "debt"
  | "budget"
  | "envelope"
  | "goals"
  | "planning"
  | "savings";

export interface AdvisorInsight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  body: string;
  metric?: string;
  href?: string;
  actionLabel?: string;
}

export interface AdvisorAction {
  id: string;
  priority: number;
  title: string;
  description: string;
  href: string;
  label: string;
}

export interface HealthScoreBreakdown {
  overall: number;
  savingsRate: number;
  liquidity: number;
  budgetDiscipline: number;
  envelopeHealth: number;
  cashFlowTrend: number;
  goalProgress: number;
  planningOutlook: number;
}

export interface AdvisorSnapshot {
  netWorth: number;
  assets: number;
  liabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  checkingBalance: number;
  monthsOfExpenses: number;
  debtToAssetRatio: number;
}

export interface FinancialAdvisorData {
  generatedAt: string;
  snapshot: AdvisorSnapshot;
  healthScore: HealthScoreBreakdown;
  insights: AdvisorInsight[];
  actions: AdvisorAction[];
  summary: string;
}
