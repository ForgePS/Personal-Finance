export const ANALYTICS_HISTORY_MONTHS = 12;
export const ANALYTICS_FORECAST_MONTHS = 3;

export interface AnalyticsMonthBucket {
  monthKey: string;
  monthLabel: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  scheduledIncome: number;
  scheduledExpenses: number;
  variableExpenses: number;
  isForecast: boolean;
}

export interface CategoryAnalytic {
  id: string;
  name: string;
  color: string;
  icon: string;
  currentMonth: number;
  avgMonthly: number;
  trendPercent: number;
  percentOfTotal: number;
  predictedNextMonth: number;
  scheduledNextMonth: number;
}

export interface MerchantSpending {
  merchant: string;
  amount: number;
  count: number;
  percent: number;
}

export interface UpcomingExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  categoryName?: string;
  frequency: string;
}

export interface ForecastMonth {
  monthKey: string;
  monthLabel: string;
  scheduledIncome: number;
  scheduledExpenses: number;
  predictedVariableExpenses: number;
  predictedTotalExpenses: number;
  predictedIncome: number;
  predictedNet: number;
  scheduledShare: number;
  scheduledExpenseItems: Array<{
    name: string;
    amount: number;
    date: string;
    categoryName?: string;
  }>;
  categoryForecasts: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    scheduled: number;
    variable: number;
    total: number;
  }>;
}

export interface AnalyticsInsight {
  id: string;
  severity: "info" | "warning" | "success" | "danger";
  title: string;
  body: string;
}

export interface AnalyticsSummary {
  netWorth: number;
  assets: number;
  liabilities: number;
  liquidAssets: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthSavings: number;
  currentMonthSavingsRate: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  avgMonthlySavings: number;
  avgSavingsRate: number;
  expenseTrendPercent: number;
  incomeTrendPercent: number;
  projectedNextMonthExpenses: number;
  projectedNextMonthIncome: number;
  projectedNextMonthNet: number;
}

export interface MonthlyCategorySpending {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentOfTotal: number;
}

export interface MonthlyEnvelopeSpending {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

export interface HistoricalMonthSnapshot {
  monthKey: string;
  monthLabel: string;
  totalExpenses: number;
  categories: MonthlyCategorySpending[];
  envelopes: MonthlyEnvelopeSpending[];
  hasEnvelopes: boolean;
}

export interface AnalyticsData {
  generatedAt: string;
  accountId: string | null;
  summary: AnalyticsSummary;
  cashFlowTimeline: AnalyticsMonthBucket[];
  categoryAnalytics: CategoryAnalytic[];
  merchantSpending: MerchantSpending[];
  upcomingExpenses: UpcomingExpense[];
  forecastMonths: ForecastMonth[];
  insights: AnalyticsInsight[];
  historicalMonths: HistoricalMonthSnapshot[];
}
