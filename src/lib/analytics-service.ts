import { db } from "@/lib/db";
import { isLiability } from "@/lib/constants";
import { accountTransactionWhere } from "@/lib/dashboard-accounts";
import { getTransactionDisplayAmountForAccount } from "@/lib/debt-payment-service";
import { getScheduleOccurrencesInRange } from "@/lib/schedule-service";
import type { ScheduleInput } from "@/lib/schedule-types";
import { formatFrequencyLabel } from "@/lib/schedule-service";
import {
  ANALYTICS_FORECAST_MONTHS,
  ANALYTICS_HISTORY_MONTHS,
  type AnalyticsData,
  type AnalyticsInsight,
  type AnalyticsMonthBucket,
  type AnalyticsSummary,
  type CategoryAnalytic,
  type ForecastMonth,
  type MerchantSpending,
  type UpcomingExpense,
} from "@/lib/analytics-types";
import { formatDateKey, getMonthEnd, getMonthKey, getMonthStart } from "@/lib/utils";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

const round2 = (n: number) => Math.round(n * 100) / 100;

function txAmount(
  tx: {
    accountId: string;
    transferAccountId?: string | null;
    debtAccountId?: string | null;
    amount: number;
    isTransfer?: boolean;
  },
  accountId?: string | null
) {
  if (!accountId) return tx.amount;
  return getTransactionDisplayAmountForAccount(tx, accountId);
}

function savingsRate(income: number, expenses: number) {
  return income > 0 ? round2(((income - expenses) / income) * 100) : 0;
}

function trendPercent(current: number, baseline: number) {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return round2(((current - baseline) / baseline) * 100);
}

function monthLabel(date: Date) {
  return format(date, "MMM yyyy");
}

function shortMonthLabel(date: Date) {
  return format(date, "MMM");
}

async function loadSchedules() {
  const [paySchedules, scheduledExpenses] = await Promise.all([
    db.paySchedule.findMany({
      where: { isActive: true },
      include: { category: true },
    }),
    db.scheduledExpense.findMany({
      where: { isActive: true },
      include: { category: true },
    }),
  ]);
  return { paySchedules, scheduledExpenses };
}

function scheduledTotalsForMonth(
  paySchedules: ScheduleInput[],
  scheduledExpenses: ScheduleInput[],
  month: Date
) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const incomeOccurrences = paySchedules.flatMap((s) =>
    getScheduleOccurrencesInRange(s, start, end, "income")
  );
  const expenseOccurrences = scheduledExpenses.flatMap((s) =>
    getScheduleOccurrencesInRange(s, start, end, "expense")
  );

  return {
    scheduledIncome: incomeOccurrences.reduce((s, o) => s + o.amount, 0),
    scheduledExpenses: expenseOccurrences.reduce((s, o) => s + o.amount, 0),
    incomeOccurrences,
    expenseOccurrences,
  };
}

function bucketTransactionsByMonth<T extends { date: Date | string }>(
  transactions: T[],
  months: Date[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const month of months) {
    map.set(getMonthKey(month), []);
  }

  for (const tx of transactions) {
    const key = getMonthKey(new Date(tx.date));
    const bucket = map.get(key);
    if (bucket) bucket.push(tx);
  }

  return map;
}

function computeVariableEstimate(historicalBuckets: AnalyticsMonthBucket[]) {
  const actual = historicalBuckets.filter((b) => !b.isForecast);
  if (actual.length === 0) return 0;

  const recent = actual.slice(-6);
  const variableSamples = recent.map((b) => Math.max(0, b.expenses - b.scheduledExpenses));
  return round2(variableSamples.reduce((s, v) => s + v, 0) / recent.length);
}

function buildCategoryForecasts(
  scheduledExpenses: ScheduleInput[],
  nextMonth: Date,
  variableEstimate: number,
  categoryAvgSpend: Map<string, { name: string; color: string; avg: number }>
) {
  const start = startOfMonth(nextMonth);
  const end = endOfMonth(nextMonth);
  const occurrences = scheduledExpenses.flatMap((s) =>
    getScheduleOccurrencesInRange(s, start, end, "expense")
  );

  const scheduledByCategory = new Map<string, { name: string; color: string; amount: number }>();
  for (const occ of occurrences) {
    const schedule = scheduledExpenses.find((s) => s.id === occ.scheduleId);
    const catId = schedule?.categoryId ?? "uncategorized";
    const existing = scheduledByCategory.get(catId);
    const color = schedule?.category?.color ?? "#64748b";
    scheduledByCategory.set(catId, {
      name: occ.categoryName ?? schedule?.category?.name ?? "Uncategorized",
      color,
      amount: (existing?.amount ?? 0) + occ.amount,
    });
  }

  const allCategoryIds = new Set([
    ...scheduledByCategory.keys(),
    ...categoryAvgSpend.keys(),
  ]);

  const forecasts: ForecastMonth["categoryForecasts"] = [];
  let assignedVariable = 0;

  for (const categoryId of allCategoryIds) {
    const scheduled = scheduledByCategory.get(categoryId);
    const historical = categoryAvgSpend.get(categoryId);
    const scheduledAmount = scheduled?.amount ?? 0;
    const historicalAvg = historical?.avg ?? 0;
    const variable = round2(Math.max(0, historicalAvg - scheduledAmount));
    assignedVariable += variable;

    forecasts.push({
      categoryId,
      categoryName: scheduled?.name ?? historical?.name ?? "Other",
      color: scheduled?.color ?? historical?.color ?? "#64748b",
      scheduled: round2(scheduledAmount),
      variable,
      total: round2(scheduledAmount + variable),
    });
  }

  const leftover = round2(Math.max(0, variableEstimate - assignedVariable));
  if (leftover > 0) {
    const other = forecasts.find((f) => f.categoryName === "Other" || f.categoryId === "uncategorized");
    if (other) {
      other.variable = round2(other.variable + leftover);
      other.total = round2(other.total + leftover);
    } else {
      forecasts.push({
        categoryId: "other",
        categoryName: "Other spending",
        color: "#94a3b8",
        scheduled: 0,
        variable: leftover,
        total: leftover,
      });
    }
  }

  return forecasts.sort((a, b) => b.total - a.total);
}

function buildInsights(
  summary: AnalyticsSummary,
  forecastMonths: ForecastMonth[],
  upcomingExpenses: UpcomingExpense[],
  categoryAnalytics: CategoryAnalytic[]
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  if (summary.expenseTrendPercent > 15) {
    insights.push({
      id: "expense-trend-up",
      severity: "warning",
      title: "Spending is trending up",
      body: `Expenses are ${summary.expenseTrendPercent.toFixed(0)}% higher than your 3-month average. Review top categories for savings opportunities.`,
    });
  } else if (summary.expenseTrendPercent < -10) {
    insights.push({
      id: "expense-trend-down",
      severity: "success",
      title: "Spending is down",
      body: `Expenses are ${Math.abs(summary.expenseTrendPercent).toFixed(0)}% below your recent average — nice work staying under trend.`,
    });
  }

  if (summary.currentMonthSavingsRate < 0) {
    insights.push({
      id: "negative-savings",
      severity: "danger",
      title: "Spending exceeds income this month",
      body: `You're ${formatCurrencyAbs(summary.currentMonthExpenses - summary.currentMonthIncome)} over income so far this month.`,
    });
  } else if (summary.currentMonthSavingsRate >= 20) {
    insights.push({
      id: "strong-savings",
      severity: "success",
      title: "Strong savings rate",
      body: `You're saving ${summary.currentMonthSavingsRate.toFixed(0)}% of income this month (avg ${summary.avgSavingsRate.toFixed(0)}%).`,
    });
  }

  const nextForecast = forecastMonths[0];
  if (nextForecast) {
    if (nextForecast.predictedNet < 0) {
      insights.push({
        id: "forecast-deficit",
        severity: "warning",
        title: "Projected deficit next month",
        body: `Based on scheduled bills and spending patterns, ${nextForecast.monthLabel} may run ${formatCurrencyAbs(nextForecast.predictedNet)} short.`,
      });
    }

    if (nextForecast.scheduledShare >= 70) {
      insights.push({
        id: "forecast-high-confidence",
        severity: "info",
        title: "Forecast is mostly scheduled",
        body: `${nextForecast.scheduledShare.toFixed(0)}% of next month's predicted expenses come from known bills and pay schedules.`,
      });
    }
  }

  const largestUpcoming = upcomingExpenses[0];
  if (largestUpcoming && largestUpcoming.amount >= 200) {
    insights.push({
      id: "large-upcoming",
      severity: "info",
      title: `Upcoming: ${largestUpcoming.name}`,
      body: `${formatCurrencyAbs(largestUpcoming.amount)} due ${largestUpcoming.date}${largestUpcoming.categoryName ? ` · ${largestUpcoming.categoryName}` : ""}.`,
    });
  }

  const fastestGrowing = [...categoryAnalytics]
    .filter((c) => c.avgMonthly > 50 && c.trendPercent > 25)
    .sort((a, b) => b.trendPercent - a.trendPercent)[0];
  if (fastestGrowing) {
    insights.push({
      id: "category-spike",
      severity: "warning",
      title: `${fastestGrowing.name} spending up`,
      body: `This category is ${fastestGrowing.trendPercent.toFixed(0)}% above its monthly average.`,
    });
  }

  return insights.slice(0, 6);
}

function formatCurrencyAbs(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
}

export async function getAnalyticsData(
  accountId?: string | null,
  referenceMonth?: Date
): Promise<AnalyticsData> {
  const now = referenceMonth ?? new Date();
  const currentMonth = startOfMonth(now);

  const historyMonths = Array.from({ length: ANALYTICS_HISTORY_MONTHS }, (_, i) =>
    startOfMonth(subMonths(currentMonth, ANALYTICS_HISTORY_MONTHS - 1 - i))
  );
  const forecastMonthsList = Array.from({ length: ANALYTICS_FORECAST_MONTHS }, (_, i) =>
    startOfMonth(addMonths(currentMonth, i + 1))
  );

  const rangeStart = historyMonths[0];
  const rangeEnd = getMonthEnd(now);

  const [accounts, allTransactions, categories, { paySchedules, scheduledExpenses }] =
    await Promise.all([
      db.account.findMany({ where: { isArchived: false } }),
      db.transaction.findMany({
        where: {
          date: { gte: rangeStart, lte: rangeEnd },
          isTransfer: false,
          ...(accountId ? accountTransactionWhere(accountId) : {}),
        },
        include: { category: true },
        orderBy: { date: "desc" },
      }),
      db.category.findMany(),
      loadSchedules(),
    ]);

  const assets = accounts
    .filter((a) => !isLiability(a.type))
    .reduce((sum, a) => sum + a.balance, 0);
  const liabilities = accounts
    .filter((a) => isLiability(a.type))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const liquidAssets = accounts
    .filter((a) => !isLiability(a.type) && ["CHECKING", "SAVINGS", "CASH"].includes(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  const txByMonth = bucketTransactionsByMonth(allTransactions, historyMonths);

  const cashFlowTimeline: AnalyticsMonthBucket[] = [];

  for (const month of historyMonths) {
    const key = getMonthKey(month);
    const txs = txByMonth.get(key) ?? [];
    const scheduled = scheduledTotalsForMonth(paySchedules, scheduledExpenses, month);

    const income = txs
      .filter((t) => txAmount(t, accountId) > 0)
      .reduce((s, t) => s + txAmount(t, accountId), 0);
    const expenses = txs
      .filter((t) => txAmount(t, accountId) < 0)
      .reduce((s, t) => s + Math.abs(txAmount(t, accountId)), 0);

    cashFlowTimeline.push({
      monthKey: key,
      monthLabel: monthLabel(month),
      income: round2(income),
      expenses: round2(expenses),
      net: round2(income - expenses),
      savingsRate: savingsRate(income, expenses),
      scheduledIncome: round2(scheduled.scheduledIncome),
      scheduledExpenses: round2(scheduled.scheduledExpenses),
      variableExpenses: round2(Math.max(0, expenses - scheduled.scheduledExpenses)),
      isForecast: false,
    });
  }

  const variableEstimate = computeVariableEstimate(cashFlowTimeline);

  const forecastMonths: ForecastMonth[] = forecastMonthsList.map((month) => {
    const scheduled = scheduledTotalsForMonth(paySchedules, scheduledExpenses, month);
    const predictedTotalExpenses = round2(scheduled.scheduledExpenses + variableEstimate);
    const predictedIncome = round2(scheduled.scheduledIncome);
    const predictedNet = round2(predictedIncome - predictedTotalExpenses);
    const scheduledShare =
      predictedTotalExpenses > 0
        ? round2((scheduled.scheduledExpenses / predictedTotalExpenses) * 100)
        : 0;

    const categoryAvgSpend = new Map<string, { name: string; color: string; avg: number }>();
    for (const cat of categories) {
      if (cat.type !== "EXPENSE") continue;
      const catTxs = allTransactions.filter(
        (t) => t.categoryId === cat.id && txAmount(t, accountId) < 0
      );
      if (catTxs.length === 0) continue;
      const total = catTxs.reduce((s, t) => s + Math.abs(txAmount(t, accountId)), 0);
      categoryAvgSpend.set(cat.id, {
        name: cat.name,
        color: cat.color,
        avg: round2(total / ANALYTICS_HISTORY_MONTHS),
      });
    }

    return {
      monthKey: getMonthKey(month),
      monthLabel: monthLabel(month),
      scheduledIncome: round2(scheduled.scheduledIncome),
      scheduledExpenses: round2(scheduled.scheduledExpenses),
      predictedVariableExpenses: variableEstimate,
      predictedTotalExpenses,
      predictedIncome,
      predictedNet,
      scheduledShare,
      scheduledExpenseItems: scheduled.expenseOccurrences.map((o) => ({
        name: o.name,
        amount: o.amount,
        date: formatDateKey(o.date),
        categoryName: o.categoryName,
      })),
      categoryForecasts: buildCategoryForecasts(
        scheduledExpenses,
        month,
        variableEstimate,
        categoryAvgSpend
      ),
    };
  });

  for (const month of forecastMonthsList) {
    const scheduled = scheduledTotalsForMonth(paySchedules, scheduledExpenses, month);
    const predictedTotalExpenses = round2(scheduled.scheduledExpenses + variableEstimate);
    cashFlowTimeline.push({
      monthKey: getMonthKey(month),
      monthLabel: shortMonthLabel(month),
      income: round2(scheduled.scheduledIncome),
      expenses: predictedTotalExpenses,
      net: round2(scheduled.scheduledIncome - predictedTotalExpenses),
      savingsRate: savingsRate(scheduled.scheduledIncome, predictedTotalExpenses),
      scheduledIncome: round2(scheduled.scheduledIncome),
      scheduledExpenses: round2(scheduled.scheduledExpenses),
      variableExpenses: variableEstimate,
      isForecast: true,
    });
  }

  const currentBucket = cashFlowTimeline.find((b) => b.monthKey === getMonthKey(currentMonth))!;
  const historicalOnly = cashFlowTimeline.filter((b) => !b.isForecast);
  const avgMonthlyIncome =
    historicalOnly.reduce((s, b) => s + b.income, 0) / historicalOnly.length;
  const avgMonthlyExpenses =
    historicalOnly.reduce((s, b) => s + b.expenses, 0) / historicalOnly.length;
  const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;
  const avgSavingsRate = savingsRate(avgMonthlyIncome, avgMonthlyExpenses);

  const prior3 = historicalOnly.slice(-4, -1);
  const prior3AvgExpenses =
    prior3.length > 0 ? prior3.reduce((s, b) => s + b.expenses, 0) / prior3.length : 0;
  const prior3AvgIncome =
    prior3.length > 0 ? prior3.reduce((s, b) => s + b.income, 0) / prior3.length : 0;

  const summary: AnalyticsSummary = {
    netWorth: round2(assets - liabilities),
    assets: round2(assets),
    liabilities: round2(liabilities),
    liquidAssets: round2(liquidAssets),
    currentMonthIncome: currentBucket.income,
    currentMonthExpenses: currentBucket.expenses,
    currentMonthSavings: currentBucket.net,
    currentMonthSavingsRate: currentBucket.savingsRate,
    avgMonthlyIncome: round2(avgMonthlyIncome),
    avgMonthlyExpenses: round2(avgMonthlyExpenses),
    avgMonthlySavings: round2(avgMonthlySavings),
    avgSavingsRate,
    expenseTrendPercent: trendPercent(currentBucket.expenses, prior3AvgExpenses),
    incomeTrendPercent: trendPercent(currentBucket.income, prior3AvgIncome),
    projectedNextMonthExpenses: forecastMonths[0]?.predictedTotalExpenses ?? 0,
    projectedNextMonthIncome: forecastMonths[0]?.predictedIncome ?? 0,
    projectedNextMonthNet: forecastMonths[0]?.predictedNet ?? 0,
  };

  const currentMonthTxs = txByMonth.get(getMonthKey(currentMonth)) ?? [];
  const spendingByCategory = new Map<
    string,
    { id: string; name: string; color: string; icon: string; current: number; total: number; months: number }
  >();

  for (const cat of categories) {
    if (cat.type !== "EXPENSE") continue;
    spendingByCategory.set(cat.id, {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      current: 0,
      total: 0,
      months: 0,
    });
  }

  for (const month of historyMonths) {
    const key = getMonthKey(month);
    const txs = txByMonth.get(key) ?? [];
    const seenCats = new Set<string>();
    for (const tx of txs) {
      if (!tx.categoryId || txAmount(tx, accountId) >= 0) continue;
      const entry = spendingByCategory.get(tx.categoryId);
      if (!entry) continue;
      const amt = Math.abs(txAmount(tx, accountId));
      entry.total += amt;
      if (key === getMonthKey(currentMonth)) entry.current += amt;
      seenCats.add(tx.categoryId);
    }
    for (const catId of seenCats) {
      const entry = spendingByCategory.get(catId);
      if (entry) entry.months += 1;
    }
  }

  const totalCurrentExpenses = currentBucket.expenses || 1;
  const nextMonthForecasts = forecastMonths[0]?.categoryForecasts ?? [];

  const categoryAnalytics: CategoryAnalytic[] = [...spendingByCategory.values()]
    .map((entry) => {
      const avgMonthly = entry.months > 0 ? round2(entry.total / ANALYTICS_HISTORY_MONTHS) : 0;
      const forecast = nextMonthForecasts.find(
        (f) => f.categoryId === entry.id || f.categoryName === entry.name
      );
      return {
        id: entry.id,
        name: entry.name,
        color: entry.color,
        icon: entry.icon,
        currentMonth: round2(entry.current),
        avgMonthly,
        trendPercent: trendPercent(entry.current, avgMonthly),
        percentOfTotal: round2((entry.current / totalCurrentExpenses) * 100),
        predictedNextMonth: forecast?.total ?? avgMonthly,
        scheduledNextMonth: forecast?.scheduled ?? 0,
      };
    })
    .filter((c) => c.avgMonthly > 0 || c.currentMonth > 0)
    .sort((a, b) => b.currentMonth - a.currentMonth);

  const merchantMap = new Map<string, { amount: number; count: number }>();
  for (const tx of allTransactions) {
    if (txAmount(tx, accountId) >= 0) continue;
    const key = (tx.merchant || tx.description || "Unknown").trim();
    const existing = merchantMap.get(key) ?? { amount: 0, count: 0 };
    existing.amount += Math.abs(txAmount(tx, accountId));
    existing.count += 1;
    merchantMap.set(key, existing);
  }

  const merchantTotal = [...merchantMap.values()].reduce((s, m) => s + m.amount, 0) || 1;
  const merchantSpending: MerchantSpending[] = [...merchantMap.entries()]
    .map(([merchant, data]) => ({
      merchant,
      amount: round2(data.amount),
      count: data.count,
      percent: round2((data.amount / merchantTotal) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);

  const upcomingRangeEnd = addMonths(now, 2);
  const upcomingScheduled = scheduledExpenses.flatMap((s) =>
    getScheduleOccurrencesInRange(s, now, upcomingRangeEnd, "expense")
  );

  const upcomingExpenses: UpcomingExpense[] = upcomingScheduled
    .filter((o) => o.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 20)
    .map((o) => {
      const schedule = scheduledExpenses.find((s) => s.id === o.scheduleId);
      return {
        id: o.id,
        name: o.name,
        amount: o.amount,
        date: formatDateKey(o.date),
        categoryName: o.categoryName,
        frequency: schedule ? formatFrequencyLabel(schedule) : "Scheduled",
      };
    });

  const insights = buildInsights(summary, forecastMonths, upcomingExpenses, categoryAnalytics);

  return {
    generatedAt: new Date().toISOString(),
    accountId: accountId ?? null,
    summary,
    cashFlowTimeline,
    categoryAnalytics,
    merchantSpending,
    upcomingExpenses,
    forecastMonths,
    insights,
  };
}
