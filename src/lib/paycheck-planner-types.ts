export const PLANNER_HORIZON_DAYS = 30;

export type PlannerEventStatus =
  | "ok"
  | "shortfall"
  | "pending_move"
  | "envelope_shortfall"
  | "fulfilled";

export type PlannerEventKind = "balance" | "scheduled" | "transaction";

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
  occurrenceKey?: string;
  scheduleId?: string;
  transactionId?: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  kind: PlannerEventKind;
  originalDate: string;
  effectiveDate: string;
  priority: number;
  runningBalance: number;
  balanceAfter: number;
  status: PlannerEventStatus;
  color: string;
  categoryId?: string;
  categoryName?: string;
  envelopeRemaining?: number | null;
  envelopeAllocated?: number | null;
  linkedTransactionId?: string;
  adjustment?: PlannerAdjustment;
}

export interface PlannerEnvelopeSummary {
  totalFunds: number;
  totalAllocated: number;
  unallocated: number;
  totalSpent: number;
}

export interface EnvelopeAllocationSuggestion {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  monthlyTarget: number;
}

export interface PaycheckAllocation {
  occurrenceKey: string;
  name: string;
  date: string;
  paycheckAmount: number;
  allocations: EnvelopeAllocationSuggestion[];
  totalAllocated: number;
  leftover: number;
  constrained: boolean;
}

export interface PaycheckAllocationPlan {
  month: string;
  totalMonthlyIncome: number;
  totalMonthlyTargets: number;
  coverageRatio: number;
  paychecks: PaycheckAllocation[];
}

export interface LinkableTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId?: string | null;
  categoryName?: string;
  scheduleOccurrenceKey?: string | null;
  suggestedOccurrenceKey?: string;
  suggestedScheduleName?: string;
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
  fulfilledCount: number;
  envelopeShortfallCount: number;
}

export interface ScheduleLinkTarget {
  occurrenceKey: string;
  name: string;
  date: string;
  amount: number;
  type: "income" | "expense";
}

export interface PlannerAccountOption {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface PaycheckPlannerData {
  accountId: string | null;
  accountName: string | null;
  accounts: PlannerAccountOption[];
  rangeStart: string;
  rangeEnd: string;
  startingBalance: number;
  summary: PaycheckPlannerSummary;
  events: PlannerEvent[];
  fulfilledEvents: PlannerEvent[];
  adjustments: PlannerAdjustment[];
  expensePriorities: Array<{ scheduleId: string; name: string; priority: number }>;
  envelopeSummary: PlannerEnvelopeSummary | null;
  allocationPlan: PaycheckAllocationPlan | null;
  linkableTransactions: LinkableTransaction[];
  linkTargets: ScheduleLinkTarget[];
}
