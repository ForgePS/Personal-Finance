"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  AdvisorInsight,
  FinancialAdvisorData,
  HealthScoreBreakdown,
  InsightSeverity,
} from "@/lib/financial-advisor-types";

const severityConfig: Record<
  InsightSeverity,
  { icon: typeof AlertTriangle; border: string; bg: string; text: string; label: string }
> = {
  critical: {
    icon: AlertTriangle,
    border: "border-rose-200",
    bg: "bg-rose-50/70",
    text: "text-rose-800",
    label: "Needs attention",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200",
    bg: "bg-amber-50/70",
    text: "text-amber-900",
    label: "Watch",
  },
  opportunity: {
    icon: Lightbulb,
    border: "border-sky-200",
    bg: "bg-sky-50/70",
    text: "text-sky-900",
    label: "Opportunity",
  },
  positive: {
    icon: CheckCircle2,
    border: "border-emerald-200",
    bg: "bg-emerald-50/70",
    text: "text-emerald-900",
    label: "On track",
  },
};

const scoreLabels: { key: keyof Omit<HealthScoreBreakdown, "overall">; label: string }[] = [
  { key: "savingsRate", label: "Savings rate" },
  { key: "liquidity", label: "Emergency buffer" },
  { key: "budgetDiscipline", label: "Budget discipline" },
  { key: "envelopeHealth", label: "Envelope health" },
  { key: "cashFlowTrend", label: "Cash flow trend" },
  { key: "goalProgress", label: "Goal progress" },
  { key: "planningOutlook", label: "30-day outlook" },
];

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function overallLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 40) return "Needs work";
  return "At risk";
}

function HealthScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const stroke =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-slate-900">{score}</p>
        <p className="text-xs font-medium text-slate-500">{overallLabel(score)}</p>
      </div>
    </div>
  );
}

function InsightCard({ item }: { item: AdvisorInsight }) {
  const config = severityConfig[item.severity];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-xl border p-4", config.border, config.bg)}>
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.text)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("font-medium", config.text)}>{item.title}</p>
            {item.metric && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {item.metric}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          {item.href && item.actionLabel && (
            <Link
              href={item.href}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {item.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdvisorPageClient({ initialData }: { initialData: FinancialAdvisorData }) {
  const { snapshot, healthScore, insights, actions, summary } = initialData;

  const critical = insights.filter((i) => i.severity === "critical");
  const warnings = insights.filter((i) => i.severity === "warning");
  const opportunities = insights.filter((i) => i.severity === "opportunity");
  const positives = insights.filter((i) => i.severity === "positive");

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Advisor</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{summary}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center lg:col-span-1" padding>
          <p className="mb-4 text-sm font-medium text-slate-500">Financial health score</p>
          <HealthScoreRing score={healthScore.overall} />
          <div className="mt-6 w-full space-y-2.5">
            {scoreLabels.map(({ key, label }) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium text-slate-800">{healthScore[key]}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full transition-all", scoreColor(healthScore[key]))}
                    style={{ width: `${healthScore[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Net worth"
              value={formatCurrency(snapshot.netWorth)}
              icon={<Wallet className="h-5 w-5" />}
              accent="indigo"
            />
            <StatCard
              label="Savings rate"
              value={`${(snapshot.savingsRate * 100).toFixed(0)}%`}
              change={`${formatCurrency(snapshot.monthlyIncome - snapshot.monthlyExpenses)} this month`}
              icon={<TrendingUp className="h-5 w-5" />}
              accent={snapshot.savingsRate >= 0.1 ? "green" : "amber"}
            />
            <StatCard
              label="Liquid buffer"
              value={`${snapshot.monthsOfExpenses.toFixed(1)} mo`}
              change={`${formatCurrency(snapshot.checkingBalance)} in checking/cash`}
              icon={<Shield className="h-5 w-5" />}
              accent={snapshot.monthsOfExpenses >= 3 ? "green" : "amber"}
            />
            <StatCard
              label="Monthly cash flow"
              value={formatCurrency(snapshot.monthlyIncome - snapshot.monthlyExpenses)}
              change={`${formatCurrency(snapshot.monthlyIncome)} in · ${formatCurrency(snapshot.monthlyExpenses)} out`}
              icon={
                snapshot.monthlyIncome >= snapshot.monthlyExpenses ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
              accent={snapshot.monthlyIncome >= snapshot.monthlyExpenses ? "green" : "red"}
            />
          </div>
        </div>
      </div>

      {actions.length > 0 && (
        <Card padding>
          <CardHeader
            title="Recommended actions"
            subtitle="Prioritized steps based on your current financial picture"
          />
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{action.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{action.description}</p>
                  </div>
                </div>
                <Link
                  href={action.href}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {action.label}
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {critical.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            Needs attention ({critical.length})
          </h2>
          <div className="space-y-3">
            {critical.map((item) => (
              <InsightCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-800">
            Watch ({warnings.length})
          </h2>
          <div className="space-y-3">
            {warnings.map((item) => (
              <InsightCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {opportunities.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sky-800">
              Opportunities ({opportunities.length})
            </h2>
            <div className="space-y-3">
              {opportunities.map((item) => (
                <InsightCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {positives.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-800">
              <Target className="h-4 w-4" />
              On track ({positives.length})
            </h2>
            <div className="space-y-3">
              {positives.map((item) => (
                <InsightCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Analysis based on your accounts, transactions, budgets, envelopes, goals, and 30-day
        paycheck projection. Updated when you open this page.
      </p>
    </div>
  );
}
