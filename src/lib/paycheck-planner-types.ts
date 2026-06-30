export const PLANNER_HORIZON_DAYS = 30;

export type PlannerEventStatus = "ok" | "shortfall" | "pending_move";

export interface PlannerAdjustment {
  id: string;
  occurrenceKey: string;
  originalDate: string;
  adjustedDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes?: string | null;
}

export interface PlannerEvent {
  id: string;
  occurrenceKey: string;
  scheduleId: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  originalDate: string;
  effectiveDate: string;
  priority: number;
  runningBalance: number;
  balanceAfter: number;
  status: PlannerEventStatus;
  color: string;
  categoryName?: string;
  adjustment?: PlannerAdjustment;
}

export interface PaycheckPlannerSummary {
  startingBalance: number;
  endingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  lowestBalance: number;
  lowestBalanceDate: string | null;
  shortfallCount: number;
  pendingAdjustmentCount: number;
}

export interface PaycheckPlannerData {
  accountId: string | null;
  accountName: string | null;
  rangeStart: string;
  rangeEnd: string;
  startingBalance: number;
  summary: PaycheckPlannerSummary;
  events: PlannerEvent[];
  adjustments: PlannerAdjustment[];
  expensePriorities: Array<{ scheduleId: string; name: string; priority: number }>;
}
