import type { Metadata } from "next";
import { getDashboardData } from "@/lib/services";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import { StatCard } from "@/components/ui/card";
import { Card, CardHeader } from "@/components/ui/card";
import { DashboardRecentTransactions } from "@/components/dashboard-recent-transactions";
import { AccountCard } from "@/components/account-card";
import { GoalCard } from "@/components/goal-card";
import { CashFlowChart, SpendingPieChart } from "@/components/charts";
import { DashboardActions } from "@/components/dashboard-actions";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard | Money Command",
  description: "Your personal finance command center",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">{formatMonthYear(new Date())} overview</p>
        </div>
        <DashboardActions />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net Worth"
          value={formatCurrency(data.netWorth)}
          icon={<Wallet className="h-5 w-5" />}
          accent="indigo"
        />
        <StatCard
          label="Income"
          value={formatCurrency(data.income)}
          change={`+${formatCurrency(data.income)}`}
          changeLabel="this month"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(data.expenses)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="red"
        />
        <StatCard
          label="Net Savings"
          value={formatCurrency(data.savings)}
          change={data.savings >= 0 ? "On track" : "Over spending"}
          icon={<PiggyBank className="h-5 w-5" />}
          accent={data.savings >= 0 ? "green" : "amber"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Cash Flow" subtitle="Income vs expenses over 6 months" />
          <CashFlowChart data={data.cashFlowHistory} />
        </Card>
        <Card>
          <CardHeader title="Spending by Category" subtitle="This month's breakdown" />
          <SpendingPieChart data={data.categorySpending} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Transactions"
            subtitle="Latest activity across all accounts"
            action={
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />
          <DashboardRecentTransactions
            transactions={data.recentTransactions.map((tx) => ({
              id: tx.id,
              accountId: tx.accountId,
              categoryId: tx.categoryId,
              description: tx.description,
              merchant: tx.merchant,
              notes: tx.notes,
              amount: tx.amount,
              date: tx.date,
              category: tx.category,
              account: tx.account ? { name: tx.account.name, color: tx.account.color } : null,
            }))}
          />
        </Card>

        <Card>
          <CardHeader
            title="Goals"
            subtitle="Track your savings targets"
            action={
              <Link
                href="/goals"
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="space-y-4">
            {data.goals.slice(0, 3).map((goal) => (
              <GoalCard
                key={goal.id}
                name={goal.name}
                targetAmount={goal.targetAmount}
                currentAmount={goal.currentAmount}
                targetDate={goal.targetDate}
                icon={goal.icon}
                color={goal.color}
                accountName={goal.account?.name}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Accounts"
          subtitle={`${data.accounts.length} active accounts`}
          action={
            <Link
              href="/accounts"
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Manage <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.accounts.map((account) => (
            <AccountCard
              key={account.id}
              id={account.id}
              name={account.name}
              type={account.type}
              institution={account.institution}
              balance={account.balance}
              color={account.color}
              icon={account.icon}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
