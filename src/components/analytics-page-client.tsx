"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { DynamicIcon } from "@/components/dynamic-icon";
import {
  AnalyticsForecastChart,
  CategoryComparisonChart,
  CashFlowChart,
  SavingsRateChart,
  SpendingPieChart,
  type ForecastTimelinePoint,
} from "@/components/charts";
import { formatCurrency, formatShortDate, cn, getMonthKey } from "@/lib/utils";
import { buildTransactionsUrl } from "@/lib/transaction-filter-url";
import type { AnalyticsData } from "@/lib/analytics-types";
import {
  BarChart3,
  TrendingDown,
  Wallet,
  PiggyBank,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "spending", label: "Spending" },
  { id: "history", label: "History" },
  { id: "forecast", label: "Forecast" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const HISTORY_VIEWS = [
  { id: "category", label: "By category" },
  { id: "envelope", label: "By envelope" },
] as const;

type HistoryViewId = (typeof HISTORY_VIEWS)[number]["id"];

const insightIcon = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertTriangle,
};

const insightStyle = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export function AnalyticsPageClient({
  data,
  accounts,
}: {
  data: AnalyticsData;
  accounts: Array<{ id: string; name: string; type: string }>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<HistoryViewId>("category");

  const accountOptions = useMemo(
    () => [
      { value: "all", label: "All accounts" },
      ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ],
    [accounts]
  );

  const forecastChartData: ForecastTimelinePoint[] = data.cashFlowTimeline.map((b) => ({
    month: b.monthLabel,
    income: b.income,
    expenses: b.expenses,
    scheduledExpenses: b.scheduledExpenses,
    variableExpenses: b.variableExpenses,
    isForecast: b.isForecast,
  }));

  const cashFlowHistorical = data.cashFlowTimeline
    .filter((b) => !b.isForecast)
    .map((b) => ({
      month: b.monthLabel.split(" ")[0] ?? b.monthLabel,
      income: b.income,
      expenses: b.expenses,
      net: b.net,
    }));

  const savingsRateData = data.cashFlowTimeline.map((b) => ({
    month: b.monthLabel.split(" ")[0] ?? b.monthLabel,
    rate: b.savingsRate,
    isForecast: b.isForecast,
  }));

  const categoryChartData = data.categoryAnalytics.map((c) => ({
    name: c.name,
    current: c.currentMonth,
    average: c.avgMonthly,
    predicted: c.predictedNextMonth,
    color: c.color,
  }));

  const selectedHistoricalMonth = useMemo(() => {
    const months = data.historicalMonths;
    if (months.length === 0) return null;
    const fallbackKey = months[Math.max(0, months.length - 2)]?.monthKey ?? months[0].monthKey;
    const key = selectedMonthKey ?? fallbackKey;
    return months.find((m) => m.monthKey === key) ?? months[months.length - 1];
  }, [data.historicalMonths, selectedMonthKey]);

  const historicalMonthOptions = useMemo(
    () =>
      [...data.historicalMonths]
        .reverse()
        .map((m) => ({ value: m.monthKey, label: m.monthLabel })),
    [data.historicalMonths]
  );

  const categoryPieData = useMemo(
    () =>
      (selectedHistoricalMonth?.categories ?? []).map((c) => ({
        name: c.name,
        amount: c.amount,
        color: c.color,
      })),
    [selectedHistoricalMonth]
  );

  const handleAccountChange = (value: string) => {
    if (value === "all") {
      router.push("/analytics");
      return;
    }
    router.push(`/analytics?accountId=${value}`);
  };

  const goToCategoryTransactions = (categoryId: string, monthKey?: string | null) => {
    router.push(
      buildTransactionsUrl({
        accountId: data.accountId,
        categoryId,
        month: monthKey ?? null,
      })
    );
  };

  const currentMonthKey = getMonthKey(new Date());

  const categoryRowClassName =
    "flex w-full items-center gap-3 rounded-xl py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40";

  const { summary } = data;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Analytics</h1>
            <p className="text-sm text-slate-500">
              12-month history · past spending by category & envelope
            </p>
          </div>
        </div>
        <Select
          label="Account"
          value={data.accountId ?? "all"}
          onChange={(e) => handleAccountChange(e.target.value)}
          options={accountOptions}
          className="w-full lg:w-56"
        />
      </div>

      <div className="-mx-3 overflow-x-auto px-3 scrollbar-hide sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                tab === t.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Net Worth"
              value={formatCurrency(summary.netWorth)}
              icon={<Wallet className="h-5 w-5" />}
              accent="indigo"
            />
            <StatCard
              label="Avg Monthly Expenses"
              value={formatCurrency(summary.avgMonthlyExpenses)}
              change={
                summary.expenseTrendPercent > 0
                  ? `+${summary.expenseTrendPercent.toFixed(0)}%`
                  : `${summary.expenseTrendPercent.toFixed(0)}%`
              }
              changeLabel="vs 3-mo avg"
              icon={<TrendingDown className="h-5 w-5" />}
              accent="red"
            />
            <StatCard
              label="Savings Rate"
              value={`${summary.currentMonthSavingsRate.toFixed(0)}%`}
              change={`Avg ${summary.avgSavingsRate.toFixed(0)}%`}
              icon={<PiggyBank className="h-5 w-5" />}
              accent={summary.currentMonthSavingsRate >= 0 ? "green" : "amber"}
            />
            <StatCard
              label="Next Month Forecast"
              value={formatCurrency(summary.projectedNextMonthExpenses)}
              change={formatCurrency(summary.projectedNextMonthNet)}
              changeLabel="projected net"
              icon={<CalendarClock className="h-5 w-5" />}
              accent="purple"
            />
          </div>

          {data.insights.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.insights.map((insight) => {
                const Icon = insightIcon[insight.severity];
                return (
                  <div
                    key={insight.id}
                    className={cn(
                      "flex gap-3 rounded-2xl border p-4",
                      insightStyle[insight.severity]
                    )}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">{insight.title}</p>
                      <p className="mt-1 text-sm opacity-90">{insight.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Card>
            <CardHeader
              title="Income vs Expenses with Forecast"
              subtitle="Solid bars = actual · faded = predicted. Variable spending estimated from your history."
            />
            <AnalyticsForecastChart data={forecastChartData} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="12-Month Cash Flow" subtitle="Historical income and expenses" />
              <CashFlowChart data={cashFlowHistorical} />
            </Card>
            <Card>
              <CardHeader title="Savings Rate Trend" subtitle="Includes forecast months" />
              <SavingsRateChart data={savingsRateData} />
            </Card>
          </div>
        </>
      )}

      {tab === "spending" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm font-medium text-slate-500">This Month</p>
              <p className="mt-1 text-xl font-bold text-rose-600 sm:text-2xl">
                {formatCurrency(summary.currentMonthExpenses)}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-slate-500">12-Mo Average</p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {formatCurrency(summary.avgMonthlyExpenses)}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-slate-500">Liquid Assets</p>
              <p className="mt-1 text-xl font-bold text-indigo-600 sm:text-2xl">
                {formatCurrency(summary.liquidAssets)}
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Category Comparison"
              subtitle="This month vs 12-month average vs next month forecast"
            />
            <CategoryComparisonChart data={categoryChartData} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Top Categories" subtitle="Current month spending · click to view transactions" />
              <div className="divide-y divide-slate-100">
                {data.categoryAnalytics.slice(0, 10).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => goToCategoryTransactions(cat.id, currentMonthKey)}
                    className={categoryRowClassName}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <DynamicIcon name={cat.icon} className="h-4 w-4" style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{cat.name}</p>
                      <p className="text-xs text-slate-500">
                        {cat.percentOfTotal.toFixed(0)}% of spending
                        {cat.trendPercent !== 0 && (
                          <span
                            className={cn(
                              "ml-2",
                              cat.trendPercent > 0 ? "text-rose-600" : "text-emerald-600"
                            )}
                          >
                            {cat.trendPercent > 0 ? "+" : ""}
                            {cat.trendPercent.toFixed(0)}% vs avg
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-slate-900">
                      {formatCurrency(cat.currentMonth)}
                    </p>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Top Merchants" subtitle="Last 12 months" />
              <div className="divide-y divide-slate-100">
                {data.merchantSpending.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No merchant data yet</p>
                ) : (
                  data.merchantSpending.map((m) => (
                    <div key={m.merchant} className="flex items-center justify-between py-3">
                      <div className="min-w-0 pr-4">
                        <p className="truncate font-medium text-slate-900">{m.merchant}</p>
                        <p className="text-xs text-slate-500">
                          {m.count} transaction{m.count === 1 ? "" : "s"} · {m.percent.toFixed(0)}%
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-slate-900">
                        {formatCurrency(m.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "history" && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Select
              label="Month"
              value={selectedHistoricalMonth?.monthKey ?? ""}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              options={historicalMonthOptions}
              className="w-full sm:w-56"
            />
            {selectedHistoricalMonth && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-medium text-slate-500">Total spent</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-rose-600">
                  {formatCurrency(selectedHistoricalMonth.totalExpenses)}
                </p>
              </div>
            )}
          </div>

          <div className="-mx-3 overflow-x-auto px-3 scrollbar-hide sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-2">
              {HISTORY_VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setHistoryView(view.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors touch-manipulation",
                    historyView === view.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {!selectedHistoricalMonth ? (
            <Card>
              <p className="py-12 text-center text-sm text-slate-500">
                No historical spending data yet.
              </p>
            </Card>
          ) : historyView === "category" ? (
            <>
              <Card>
                <CardHeader
                  title={`${selectedHistoricalMonth.monthLabel} spending`}
                  subtitle="Actual expenses by category"
                />
                <SpendingPieChart
                  data={categoryPieData.map((c) => ({ name: c.name, amount: c.amount }))}
                  onItemClick={(name) => {
                    const cat = selectedHistoricalMonth.categories.find((c) => c.name === name);
                    if (cat) {
                      goToCategoryTransactions(cat.categoryId, selectedHistoricalMonth.monthKey);
                    }
                  }}
                />
              </Card>

              <Card>
                <CardHeader title="Category breakdown" subtitle="Click a category to view its transactions" />
                <div className="divide-y divide-slate-100">
                  {selectedHistoricalMonth.categories.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No spending recorded this month.
                    </p>
                  ) : (
                    selectedHistoricalMonth.categories.map((cat) => (
                      <button
                        key={cat.categoryId}
                        type="button"
                        onClick={() =>
                          goToCategoryTransactions(cat.categoryId, selectedHistoricalMonth.monthKey)
                        }
                        className={categoryRowClassName}
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <DynamicIcon
                            name={cat.icon}
                            className="h-4 w-4"
                            style={{ color: cat.color }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{cat.name}</p>
                          <p className="text-xs text-slate-500">
                            {cat.percentOfTotal.toFixed(0)}% of spending
                          </p>
                        </div>
                        <p className="font-semibold tabular-nums text-slate-900">
                          {formatCurrency(cat.amount)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader
                title={`${selectedHistoricalMonth.monthLabel} envelopes`}
                subtitle="Allocated vs actual spending · click to view transactions"
              />
              {!selectedHistoricalMonth.hasEnvelopes ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No envelopes were set up for this month. Switch to &ldquo;By category&rdquo; to
                  see spending either way.
                </p>
              ) : selectedHistoricalMonth.envelopes.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Envelopes exist but nothing was allocated or spent this month.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedHistoricalMonth.envelopes.map((env) => (
                    <button
                      key={env.categoryId}
                      type="button"
                      onClick={() =>
                        goToCategoryTransactions(env.categoryId, selectedHistoricalMonth.monthKey)
                      }
                      className="block w-full rounded-xl py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${env.color}20` }}
                        >
                          <DynamicIcon
                            name={env.icon}
                            className="h-4 w-4"
                            style={{ color: env.color }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{env.name}</p>
                          <p className="text-xs text-slate-500">
                            {env.allocated > 0
                              ? `${env.percentUsed.toFixed(0)}% of allocation used`
                              : "No allocation"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold tabular-nums text-slate-900">
                            {formatCurrency(env.spent)}
                          </p>
                          {env.allocated > 0 && (
                            <p className="text-xs text-slate-500">
                              of {formatCurrency(env.allocated)}
                            </p>
                          )}
                        </div>
                      </div>
                      {env.allocated > 0 && (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              env.remaining < 0 ? "bg-rose-500" : "bg-indigo-500"
                            )}
                            style={{
                              width: `${Math.min(100, env.percentUsed)}%`,
                            }}
                          />
                        </div>
                      )}
                      <div className="mt-2 flex justify-between text-xs text-slate-500">
                        <span>Spent {formatCurrency(env.spent)}</span>
                        {env.allocated > 0 && (
                          <span
                            className={cn(
                              env.remaining < 0 ? "text-rose-600" : "text-emerald-600"
                            )}
                          >
                            {env.remaining < 0 ? "Over by " : "Remaining "}
                            {formatCurrency(Math.abs(env.remaining))}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {tab === "forecast" && (
        <>
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">How predictions work</h3>
                  <p className="mt-1 max-w-xl text-sm text-slate-600">
                    Future expenses combine your <strong>scheduled bills</strong> (from Planning)
                    plus a <strong>variable spending estimate</strong> based on your average
                    discretionary spending over the last 6 months.
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => router.push("/planning")}>
                Edit schedules
              </Button>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {data.forecastMonths.map((month) => (
              <Card key={month.monthKey}>
                <CardHeader title={month.monthLabel} subtitle="Expense forecast" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled bills</span>
                    <span className="font-semibold tabular-nums text-rose-600">
                      {formatCurrency(month.scheduledExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Variable (est.)</span>
                    <span className="font-semibold tabular-nums text-rose-400">
                      {formatCurrency(month.predictedVariableExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="font-medium text-slate-700">Total expenses</span>
                    <span className="font-bold tabular-nums text-rose-600">
                      {formatCurrency(month.predictedTotalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expected income</span>
                    <span className="font-semibold tabular-nums text-emerald-600">
                      {formatCurrency(month.predictedIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="font-medium text-slate-700">Projected net</span>
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        month.predictedNet >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}
                    >
                      {formatCurrency(month.predictedNet)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {month.scheduledShare.toFixed(0)}% from known schedules
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Upcoming Bills"
                subtitle="Scheduled expenses in the next 60 days"
              />
              <div className="divide-y divide-slate-100">
                {data.upcomingExpenses.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No upcoming scheduled expenses. Add them in Planning or Settings.
                  </p>
                ) : (
                  data.upcomingExpenses.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0 pr-4">
                        <p className="truncate font-medium text-slate-900">{bill.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatShortDate(bill.date)} · {bill.frequency}
                          {bill.categoryName ? ` · ${bill.categoryName}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-rose-600">
                        {formatCurrency(bill.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title={`${data.forecastMonths[0]?.monthLabel ?? "Next month"} by category`}
                subtitle="Scheduled + estimated variable"
              />
              <div className="divide-y divide-slate-100">
                {(data.forecastMonths[0]?.categoryForecasts ?? []).slice(0, 12).map((cat) => (
                  <div key={cat.categoryId} className="flex items-center justify-between py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-sm font-medium text-slate-900">
                        {cat.categoryName}
                      </span>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(cat.total)}
                      </p>
                      {cat.scheduled > 0 && cat.variable > 0 && (
                        <p className="text-xs text-slate-400">
                          {formatCurrency(cat.scheduled)} + {formatCurrency(cat.variable)} est.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
