import { differenceInDays, startOfMonth } from "date-fns";
import { db } from "@/lib/db";
import { isLiability } from "@/lib/constants";
import { getBudgetData, getDashboardData } from "@/lib/services";
import { getEnvelopeData } from "@/lib/envelope-service";
import { getPaycheckPlannerData } from "@/lib/paycheck-planner-service";
import { getPlanningData } from "@/lib/planning-service";
import type {
  AdvisorAction,
  AdvisorInsight,
  AdvisorSnapshot,
  FinancialAdvisorData,
  HealthScoreBreakdown,
  InsightSeverity,
} from "@/lib/financial-advisor-types";

export type { FinancialAdvisorData } from "@/lib/financial-advisor-types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

/** Use trailing months with activity so early-month partial data does not skew metrics. */
function averageFromHistory(
  history: { income: number; expenses: number }[],
  field: "income" | "expenses"
): number {
  const active = history.filter((m) => m.income > 0 || m.expenses > 0);
  if (active.length === 0) return 0;
  return active.reduce((sum, m) => sum + m[field], 0) / active.length;
}

function isEarlyInMonth(date: Date): boolean {
  return date.getDate() <= 10;
}

function scoreSavingsRate(rate: number): number {
  if (rate >= 0.2) return 100;
  if (rate >= 0.15) return 90;
  if (rate >= 0.1) return 80;
  if (rate >= 0.05) return 65;
  if (rate >= 0) return 45;
  if (rate >= -0.1) return 25;
  return 10;
}

function scoreLiquidity(months: number): number {
  if (months >= 6) return 100;
  if (months >= 3) return 85;
  if (months >= 1) return 60;
  if (months >= 0.5) return 35;
  return 15;
}

function scoreBudgetDiscipline(overCount: number, total: number): number {
  if (total === 0) return 70;
  const overRatio = overCount / total;
  if (overRatio === 0) return 100;
  if (overRatio <= 0.2) return 75;
  if (overRatio <= 0.4) return 50;
  return 25;
}

function scoreEnvelopeHealth(overspent: number, overBudget: number, total: number): number {
  if (total === 0) return 65;
  const issues = overspent + overBudget;
  if (issues === 0) return 100;
  if (issues <= 1) return 70;
  if (issues <= 2) return 50;
  return 25;
}

function scoreCashFlowTrend(history: { net: number }[]): number {
  if (history.length < 2) return 60;
  const recent = history.slice(-3);
  const positiveMonths = recent.filter((m) => m.net >= 0).length;
  const improving =
    history.length >= 2 && history[history.length - 1].net >= history[history.length - 2].net;
  if (positiveMonths === 3 && improving) return 100;
  if (positiveMonths >= 2) return 80;
  if (positiveMonths >= 1) return 55;
  return 25;
}

function scoreGoals(goals: { targetAmount: number; currentAmount: number; targetDate: Date | null }[]): number {
  if (goals.length === 0) return 60;
  const scores = goals.map((g) => {
    const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
    let s = clamp(pct * 100);
    if (g.targetDate) {
      const daysLeft = differenceInDays(g.targetDate, new Date());
      if (daysLeft < 0 && pct < 1) s = Math.min(s, 30);
      else if (daysLeft < 90 && pct < 0.5) s = Math.min(s, 50);
    }
    return s;
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function scorePlanning(
  shortfallCount: number,
  lowestBalance: number,
  startingBalance: number
): number {
  if (shortfallCount > 0) return 20;
  if (lowestBalance < 0) return 30;
  if (startingBalance > 0 && lowestBalance < startingBalance * 0.1) return 50;
  if (lowestBalance >= startingBalance * 0.5) return 100;
  return 75;
}

function insight(
  id: string,
  severity: InsightSeverity,
  category: AdvisorInsight["category"],
  title: string,
  body: string,
  opts?: { metric?: string; href?: string; actionLabel?: string }
): AdvisorInsight {
  return { id, severity, category, title, body, ...opts };
}

export async function getFinancialAdvisorData(): Promise<FinancialAdvisorData> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [dashboard, budgets, envelopes, planning, planner] = await Promise.all([
    getDashboardData(),
    getBudgetData(),
    getEnvelopeData(now),
    getPlanningData(monthKey),
    getPaycheckPlannerData(),
  ]);

  const checkingBalance = dashboard.accounts
    .filter((a) => a.type === "CHECKING" || a.type === "CASH")
    .reduce((s, a) => s + a.balance, 0);

  const savingsBalance = dashboard.accounts
    .filter((a) => a.type === "SAVINGS")
    .reduce((s, a) => s + a.balance, 0);

  const liquidBalance = checkingBalance + savingsBalance;
  const avgMonthlyIncome = averageFromHistory(dashboard.cashFlowHistory, "income");
  const avgMonthlyExpenses = averageFromHistory(dashboard.cashFlowHistory, "expenses");
  const earlyMonth = isEarlyInMonth(now);
  const incomeNotYetPosted =
    earlyMonth && dashboard.income === 0 && avgMonthlyIncome > 0;

  const monthlyIncome = incomeNotYetPosted ? avgMonthlyIncome : dashboard.income;
  const monthlyExpenses =
    earlyMonth && dashboard.expenses < avgMonthlyExpenses * 0.25 && avgMonthlyExpenses > 0
      ? avgMonthlyExpenses
      : dashboard.expenses;
  const monthlySavings = dashboard.income - dashboard.expenses;
  const savingsRate =
    monthlyIncome > 0
      ? incomeNotYetPosted
        ? round2(avgMonthlyIncome > 0 ? (avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome : 0)
        : round2(monthlySavings / monthlyIncome)
      : 0;
  const monthsOfExpenses =
    monthlyExpenses > 0 ? round2(liquidBalance / monthlyExpenses) : 0;

  const debtToAssetRatio =
    dashboard.assets > 0 ? round2(dashboard.liabilities / dashboard.assets) : 0;

  const snapshot: AdvisorSnapshot = {
    netWorth: dashboard.netWorth,
    assets: dashboard.assets,
    liabilities: dashboard.liabilities,
    monthlyIncome: dashboard.income,
    monthlyExpenses: dashboard.expenses,
    savingsRate: round2(
      dashboard.income > 0 ? dashboard.savings / dashboard.income : savingsRate
    ),
    checkingBalance: liquidBalance,
    monthsOfExpenses,
    debtToAssetRatio,
  };

  const healthScore: HealthScoreBreakdown = {
    savingsRate: scoreSavingsRate(savingsRate),
    liquidity: scoreLiquidity(monthsOfExpenses),
    budgetDiscipline: scoreBudgetDiscipline(
      budgets.filter((b) => b.isOver).length,
      budgets.length
    ),
    envelopeHealth: scoreEnvelopeHealth(
      envelopes.overspentCount,
      envelopes.overBudgetCount,
      envelopes.envelopes.length
    ),
    cashFlowTrend: scoreCashFlowTrend(
      earlyMonth && dashboard.cashFlowHistory.length > 1
        ? dashboard.cashFlowHistory.slice(0, -1)
        : dashboard.cashFlowHistory
    ),
    goalProgress: scoreGoals(dashboard.goals),
    planningOutlook: scorePlanning(
      planner.summary.shortfallCount,
      planner.summary.lowestBalance,
      planner.summary.startingBalance
    ),
    overall: 0,
  };

  healthScore.overall = Math.round(
    healthScore.savingsRate * 0.22 +
      healthScore.liquidity * 0.2 +
      healthScore.budgetDiscipline * 0.15 +
      healthScore.envelopeHealth * 0.15 +
      healthScore.cashFlowTrend * 0.1 +
      healthScore.goalProgress * 0.1 +
      healthScore.planningOutlook * 0.08
  );

  const insights: AdvisorInsight[] = [];
  const actions: AdvisorAction[] = [];
  let actionPriority = 1;

  // --- Cash flow & savings ---
  if (incomeNotYetPosted) {
    insights.push(
      insight(
        "income-not-posted",
        "opportunity",
        "cash_flow",
        "Income not recorded yet this month",
        "Payroll and other income may not have posted yet. Savings-rate and cash-flow insights use your recent monthly averages until more transactions arrive.",
        { href: "/transactions", actionLabel: "View transactions" }
      )
    );
  } else if (savingsRate < 0) {
    insights.push(
      insight(
        "negative-savings",
        "critical",
        "cash_flow",
        "Spending exceeds income this month",
        `You've spent ${fmt(Math.abs(dashboard.savings))} more than you earned so far this month. Review recent transactions and identify discretionary cuts.`,
        { metric: fmt(dashboard.savings), href: "/transactions", actionLabel: "Review transactions" }
      )
    );
    actions.push({
      id: "cut-spending",
      priority: actionPriority++,
      title: "Reduce discretionary spending",
      description: "Your expenses are outpacing income. Start with your top spending categories.",
      href: "/transactions",
      label: "View transactions",
    });
  } else if (savingsRate < 0.1 && monthlyIncome > 0) {
    insights.push(
      insight(
        "low-savings-rate",
        "warning",
        "savings",
        "Savings rate is below 10%",
        `You're saving ${(savingsRate * 100).toFixed(0)}% of income this month. Financial planners typically recommend 15–20% for long-term stability.`,
        { metric: `${(savingsRate * 100).toFixed(0)}%`, href: "/budgets", actionLabel: "Review budgets" }
      )
    );
  } else if (savingsRate >= 0.15) {
    insights.push(
      insight(
        "strong-savings",
        "positive",
        "savings",
        "Strong savings rate",
        `You're saving ${(savingsRate * 100).toFixed(0)}% of your income this month — well above the recommended minimum.`,
        { metric: `${(savingsRate * 100).toFixed(0)}%` }
      )
    );
  }

  const completedMonths = dashboard.cashFlowHistory.slice(0, -1);
  const lastTwoCompleted = completedMonths.slice(-2);
  const decliningTrend =
    lastTwoCompleted.length >= 2 &&
    lastTwoCompleted[lastTwoCompleted.length - 1].net <
      lastTwoCompleted[lastTwoCompleted.length - 2].net;
  if (
    decliningTrend &&
    lastTwoCompleted[lastTwoCompleted.length - 1].net < 0 &&
    !incomeNotYetPosted
  ) {
    insights.push(
      insight(
        "declining-cashflow",
        "warning",
        "cash_flow",
        "Cash flow trend is declining",
        "Your net cash flow has been negative recently. Compare this month's spending to prior months on the cash flow page.",
        { href: "/cash-flow", actionLabel: "View cash flow" }
      )
    );
  }

  // --- Liquidity & emergency fund ---
  if (monthsOfExpenses < 1 && monthlyExpenses > 0) {
    insights.push(
      insight(
        "low-liquidity",
        "critical",
        "liquidity",
        "Less than one month of expenses in checking",
        `You have about ${monthsOfExpenses.toFixed(1)} months of expenses in liquid accounts (${fmt(liquidBalance)}). Aim for at least 3 months as an emergency buffer.`,
        { metric: `${monthsOfExpenses.toFixed(1)} mo`, href: "/accounts", actionLabel: "View accounts" }
      )
    );
    actions.push({
      id: "build-emergency-fund",
      priority: actionPriority++,
      title: "Build an emergency fund",
      description: "Transfer funds to savings until you have at least 3 months of expenses covered.",
      href: "/goals",
      label: "Set a savings goal",
    });
  } else if (monthsOfExpenses < 3 && monthsOfExpenses >= 1) {
    insights.push(
      insight(
        "moderate-liquidity",
        "opportunity",
        "liquidity",
        "Emergency fund could be stronger",
        `You have ${monthsOfExpenses.toFixed(1)} months of expenses in checking and savings. Building toward 3–6 months provides a solid safety net.`,
        { metric: `${monthsOfExpenses.toFixed(1)} mo` }
      )
    );
  } else if (monthsOfExpenses >= 3) {
    insights.push(
      insight(
        "good-liquidity",
        "positive",
        "liquidity",
        "Healthy emergency buffer",
        `${monthsOfExpenses.toFixed(1)} months of expenses in liquid accounts gives you room to handle surprises.`,
        { metric: `${monthsOfExpenses.toFixed(1)} mo` }
      )
    );
  }

  if (savingsBalance > 0 && savingsBalance < monthlyExpenses * 3) {
    insights.push(
      insight(
        "savings-growth",
        "opportunity",
        "savings",
        "Savings account has room to grow",
        `You have ${fmt(savingsBalance)} in savings. Consider automating transfers from each paycheck.`,
        { href: "/paycheck-planner", actionLabel: "Plan paycheck allocations" }
      )
    );
  }

  // --- Debt ---
  const liabilityAccounts = dashboard.accounts.filter((a) => isLiability(a.type));
  if (liabilityAccounts.length > 0) {
    const totalDebt = liabilityAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
    if (debtToAssetRatio > 0.5) {
      insights.push(
        insight(
          "high-debt-ratio",
          "warning",
          "debt",
          "Debt is a large share of your finances",
          `Liabilities (${fmt(totalDebt)}) are ${(debtToAssetRatio * 100).toFixed(0)}% of assets. Prioritize debt payoff in your envelope and budget planning.`,
          { metric: fmt(totalDebt), href: "/accounts", actionLabel: "View debt accounts" }
        )
      );
      actions.push({
        id: "debt-paydown",
        priority: actionPriority++,
        title: "Create a debt payoff plan",
        description: "Link expenses as debt payments and track balances on liability accounts.",
        href: "/transactions",
        label: "Record debt payments",
      });
    } else {
      insights.push(
        insight(
          "manageable-debt",
          "positive",
          "debt",
          "Debt levels are manageable",
          `Total liabilities of ${fmt(totalDebt)} across ${liabilityAccounts.length} account${liabilityAccounts.length === 1 ? "" : "s"}.`,
          { metric: fmt(totalDebt) }
        )
      );
    }
  }

  // --- Budgets ---
  const overBudgets = budgets.filter((b) => b.isOver);
  if (overBudgets.length > 0) {
    const names = overBudgets
      .slice(0, 3)
      .map((b) => b.category?.name ?? "Unknown")
      .join(", ");
    insights.push(
      insight(
        "over-budget",
        "warning",
        "budget",
        `${overBudgets.length} categor${overBudgets.length === 1 ? "y is" : "ies are"} over budget`,
        `Over budget: ${names}${overBudgets.length > 3 ? ` and ${overBudgets.length - 3} more` : ""}. Adjust spending or revise limits for the rest of the month.`,
        { href: "/budgets", actionLabel: "Review budgets" }
      )
    );
    actions.push({
      id: "fix-budgets",
      priority: actionPriority++,
      title: "Address over-budget categories",
      description: `Review ${overBudgets.length} categories where spending exceeded the limit.`,
      href: "/budgets",
      label: "Open budgets",
    });
  } else if (budgets.length > 0) {
    insights.push(
      insight(
        "budgets-on-track",
        "positive",
        "budget",
        "All budgets on track",
        `None of your ${budgets.length} budget categories are over limit this month.`,
        { metric: `${budgets.length} categories` }
      )
    );
  } else {
    insights.push(
      insight(
        "no-budgets",
        "opportunity",
        "budget",
        "Set up category budgets",
        "You don't have budgets configured yet. Budgets help catch overspending before it compounds.",
        { href: "/budgets", actionLabel: "Create budgets" }
      )
    );
    actions.push({
      id: "create-budgets",
      priority: actionPriority++,
      title: "Set monthly category budgets",
      description: "Define spending limits for your top expense categories.",
      href: "/budgets",
      label: "Go to budgets",
    });
  }

  // --- Envelopes ---
  if (envelopes.envelopes.length === 0) {
    insights.push(
      insight(
        "no-envelopes",
        "opportunity",
        "envelope",
        "Start using envelope budgeting",
        "Envelope budgeting separates your money into purpose-driven categories each month, making it easier to stay on track.",
        { href: "/envelopes", actionLabel: "Set up envelopes" }
      )
    );
    actions.push({
      id: "setup-envelopes",
      priority: actionPriority++,
      title: "Create your first envelopes",
      description: "Fund a monthly pool and allocate to expense categories.",
      href: "/envelopes",
      label: "Open envelopes",
    });
  } else {
    if (envelopes.overspentCount > 0) {
      insights.push(
        insight(
          "envelope-overspent",
          "critical",
          "envelope",
          `${envelopes.overspentCount} envelope${envelopes.overspentCount === 1 ? "" : "s"} overspent`,
          "You've spent more than allocated in one or more envelopes. Reallocate from other envelopes or reduce spending.",
          { href: "/envelopes", actionLabel: "Manage envelopes" }
        )
      );
    }
    if (envelopes.overBudgetCount > 0) {
      insights.push(
        insight(
          "envelope-over-budget",
          "warning",
          "envelope",
          `${envelopes.overBudgetCount} envelope${envelopes.overBudgetCount === 1 ? "" : "s"} over monthly budget`,
          "Spending has exceeded the monthly budget target in some envelopes.",
          { href: "/envelopes", actionLabel: "Review envelopes" }
        )
      );
    }
    if (envelopes.pool.unallocated > 100) {
      insights.push(
        insight(
          "unallocated-pool",
          "opportunity",
          "envelope",
          "Unallocated pool funds available",
          `You have ${fmt(envelopes.pool.unallocated)} sitting in the envelope pool unassigned. Allocate it to categories that need funding.`,
          { metric: fmt(envelopes.pool.unallocated), href: "/envelopes", actionLabel: "Allocate funds" }
        )
      );
    }
    if (envelopes.overspentCount === 0 && envelopes.overBudgetCount === 0) {
      insights.push(
        insight(
          "envelopes-healthy",
          "positive",
          "envelope",
          "Envelopes are in good shape",
          `All ${envelopes.envelopes.length} active envelopes are within their allocated amounts.`,
          { metric: fmt(envelopes.pool.totalAllocated) }
        )
      );
    }
    if (envelopes.uncategorizedTransactions.length > 0) {
      insights.push(
        insight(
          "uncategorized-tx",
          "warning",
          "envelope",
          `${envelopes.uncategorizedTransactions.length} uncategorized transactions`,
          "Unmatched expenses won't count against envelope balances. Categorize them so your envelope totals stay accurate.",
          { href: "/envelopes", actionLabel: "Reconcile transactions" }
        )
      );
    }
  }

  // --- Goals ---
  const behindGoals = dashboard.goals.filter((g) => {
    if (!g.targetDate) return false;
    const daysLeft = differenceInDays(g.targetDate, now);
    const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
    return daysLeft < 90 && pct < 0.5;
  });
  if (behindGoals.length > 0) {
    insights.push(
      insight(
        "goals-behind",
        "warning",
        "goals",
        `${behindGoals.length} goal${behindGoals.length === 1 ? "" : "s"} may miss their target date`,
        `${behindGoals.map((g) => g.name).join(", ")} — consider increasing contributions or extending the deadline.`,
        { href: "/goals", actionLabel: "Review goals" }
      )
    );
    actions.push({
      id: "catch-up-goals",
      priority: actionPriority++,
      title: "Catch up on savings goals",
      description: "Some goals are behind schedule based on their target dates.",
      href: "/goals",
      label: "View goals",
    });
  } else if (dashboard.goals.length > 0) {
    const completed = dashboard.goals.filter(
      (g) => g.currentAmount >= g.targetAmount
    ).length;
    if (completed > 0) {
      insights.push(
        insight(
          "goals-complete",
          "positive",
          "goals",
          `${completed} goal${completed === 1 ? "" : "s"} reached`,
          "Great progress on your savings targets.",
          { href: "/goals", actionLabel: "View goals" }
        )
      );
    } else {
      insights.push(
        insight(
          "goals-on-track",
          "positive",
          "goals",
          "Savings goals are progressing",
          `Tracking ${dashboard.goals.length} goal${dashboard.goals.length === 1 ? "" : "s"} toward your targets.`,
          { href: "/goals", actionLabel: "View goals" }
        )
      );
    }
  } else {
    insights.push(
      insight(
        "no-goals",
        "opportunity",
        "goals",
        "Set a savings goal",
        "Goals give your savings a purpose — emergency fund, vacation, down payment, or debt payoff.",
        { href: "/goals", actionLabel: "Create a goal" }
      )
    );
  }

  // --- Planning & paycheck outlook ---
  if (planner.summary.shortfallCount > 0) {
    insights.push(
      insight(
        "paycheck-shortfall",
        "critical",
        "planning",
        `${planner.summary.shortfallCount} upcoming bill${planner.summary.shortfallCount === 1 ? "" : "s"} may overdraw your account`,
        `Your 30-day projection shows a lowest balance of ${fmt(planner.summary.lowestBalance)}. Reschedule lower-priority bills or adjust envelope allocations.`,
        {
          metric: fmt(planner.summary.lowestBalance),
          href: "/paycheck-planner",
          actionLabel: "Open paycheck planner",
        }
      )
    );
    actions.push({
      id: "fix-shortfall",
      priority: actionPriority++,
      title: "Address projected cash shortfall",
      description: "Reschedule bills or reduce spending before the projected overdraft date.",
      href: "/paycheck-planner",
      label: "Paycheck planner",
    });
  }

  if (planner.summary.envelopeShortfallCount > 0) {
    insights.push(
      insight(
        "envelope-planner-shortfall",
        "warning",
        "planning",
        "Scheduled bills exceed envelope balances",
        `${planner.summary.envelopeShortfallCount} upcoming expense${planner.summary.envelopeShortfallCount === 1 ? "" : "s"} exceed the envelope balance for its category.`,
        { href: "/paycheck-planner", actionLabel: "Review planner" }
      )
    );
  }

  if (
    planner.allocationPlan &&
    planner.allocationPlan.coverageRatio < 1 &&
    planner.allocationPlan.paychecks.length > 0
  ) {
    insights.push(
      insight(
        "allocation-gap",
        "warning",
        "planning",
        "Envelope targets exceed monthly income",
        `Your envelope budgets total ${fmt(planner.allocationPlan.totalMonthlyTargets)}/mo but income is about ${fmt(planner.allocationPlan.totalMonthlyIncome)}/mo. Trim budgets or find additional income.`,
        { href: "/paycheck-planner", actionLabel: "Adjust allocations" }
      )
    );
  }

  if (planning.calendar.net < 0) {
    insights.push(
      insight(
        "planning-deficit",
        "warning",
        "planning",
        "Scheduled expenses exceed income this month",
        `Your planning calendar shows ${fmt(Math.abs(planning.calendar.net))} more in scheduled expenses than income for ${monthKey}.`,
        { href: "/planning", actionLabel: "View planning calendar" }
      )
    );
  }

  const uncategorizedTxs = await db.transaction.findMany({
    where: {
      date: { gte: startOfMonth(now), lte: now },
      isTransfer: false,
      categoryId: null,
      amount: { lt: 0 },
    },
    select: { id: true },
  });
  const uncategorizedMonthTx = uncategorizedTxs.length;
  if (uncategorizedMonthTx > 5) {
    insights.push(
      insight(
        "many-uncategorized",
        "opportunity",
        "cash_flow",
        `${uncategorizedMonthTx} uncategorized expenses this month`,
        "Categorizing transactions improves budget accuracy and spending insights.",
        { href: "/transactions", actionLabel: "Categorize transactions" }
      )
    );
  }

  // Sort insights: critical first, then warning, opportunity, positive
  const severityOrder: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    opportunity: 2,
    positive: 3,
  };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  actions.sort((a, b) => a.priority - b.priority);

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;

  let summary: string;
  if (healthScore.overall >= 80) {
    summary =
      criticalCount > 0
        ? `Overall finances are strong (${healthScore.overall}/100), but ${criticalCount} issue${criticalCount === 1 ? " needs" : "s need"} immediate attention.`
        : `Your finances are in good shape with a health score of ${healthScore.overall}/100. Keep up your current habits.`;
  } else if (healthScore.overall >= 60) {
    summary = `Your financial health score is ${healthScore.overall}/100. ${warningCount + criticalCount} area${warningCount + criticalCount === 1 ? "" : "s"} could use attention — see recommendations below.`;
  } else {
    summary = `Your financial health score is ${healthScore.overall}/100. Focus on the critical items below to stabilize your finances.`;
  }

  return {
    generatedAt: now.toISOString(),
    snapshot,
    healthScore,
    insights,
    actions: actions.slice(0, 8),
    summary,
  };
}
