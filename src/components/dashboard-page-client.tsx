"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import { StatCard } from "@/components/ui/card";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { TransactionRow } from "@/components/transaction-row";
import { AccountCard } from "@/components/account-card";
import { GoalCard } from "@/components/goal-card";
import { CashFlowChart, SpendingPieChart } from "@/components/charts";
import { DashboardActions } from "@/components/dashboard-actions";
import { buildAccountSelectOptions, type AccountOption } from "@/lib/account-utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
} from "lucide-react";

interface DashboardTransaction {
  id: string;
  description: string;
  merchant: string | null;
  amount: number;
  date: string;
  isTransfer?: boolean;
  category?: { name: string; color: string; icon: string } | null;
  account?: { name: string; color: string } | null;
  transferAccount?: { name: string; color: string } | null;
  debtAccount?: { name: string; color: string } | null;
}

interface DashboardGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  icon: string;
  color: string;
  account?: { name: string } | null;
}

interface DashboardAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  balance: number;
  color: string;
  icon: string;
}

export function DashboardPageClient({
  accountId,
  selectedAccountName,
  accounts,
  netWorth,
  accountBalance,
  income,
  expenses,
  savings,
  categorySpending,
  cashFlowHistory,
  recentTransactions,
  goals,
  dashboardAccounts,
}: {
  accountId: string | null;
  selectedAccountName: string | null;
  accounts: AccountOption[];
  netWorth: number;
  accountBalance: number | null;
  income: number;
  expenses: number;
  savings: number;
  categorySpending: { name: string; amount: number }[];
  cashFlowHistory: { month: string; income: number; expenses: number; net: number }[];
  recentTransactions: DashboardTransaction[];
  goals: DashboardGoal[];
  dashboardAccounts: DashboardAccount[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const accountOptions = useMemo(
    () => [
      { value: "all", label: "All accounts" },
      ...buildAccountSelectOptions(accounts),
    ],
    [accounts]
  );

  const selectedValue = accountId ?? "all";
  const isAccountView = Boolean(accountId);
  const balanceValue = isAccountView && accountBalance != null ? accountBalance : netWorth;

  const handleAccountChange = (value: string) => {
    startTransition(() => {
      if (value === "all") {
        router.push("/?accountId=all");
        return;
      }
      router.push(`/?accountId=${value}`);
    });
  };

  const transactionsHref = accountId ? `/transactions?accountId=${accountId}` : "/transactions";

  return (
    <div className={`space-y-8 ${isPending ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {formatMonthYear(new Date())} overview
            {selectedAccountName ? ` · ${selectedAccountName}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Select
            label="Account"
            value={selectedValue}
            onChange={(e) => handleAccountChange(e.target.value)}
            options={accountOptions}
            className="w-full md:w-56"
          />
          <DashboardActions defaultAccountId={accountId ?? undefined} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={isAccountView ? "Account Balance" : "Net Worth"}
          value={formatCurrency(balanceValue)}
          icon={<Wallet className="h-5 w-5" />}
          accent="indigo"
        />
        <StatCard
          label="Income"
          value={formatCurrency(income)}
          change={`+${formatCurrency(income)}`}
          changeLabel="this month"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(expenses)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="red"
        />
        <StatCard
          label="Net Savings"
          value={formatCurrency(savings)}
          change={savings >= 0 ? "On track" : "Over spending"}
          icon={<PiggyBank className="h-5 w-5" />}
          accent={savings >= 0 ? "green" : "amber"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Cash Flow"
            subtitle={
              isAccountView
                ? `Income vs expenses for ${selectedAccountName}`
                : "Income vs expenses over 6 months"
            }
          />
          <CashFlowChart data={cashFlowHistory} />
        </Card>
        <Card>
          <CardHeader
            title="Spending by Category"
            subtitle={
              isAccountView
                ? `This month's breakdown · ${selectedAccountName}`
                : "This month's breakdown"
            }
          />
          <SpendingPieChart data={categorySpending} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Transactions"
            subtitle={
              isAccountView
                ? `Latest activity on ${selectedAccountName}`
                : "Latest activity across all accounts"
            }
            action={
              <Link
                href={transactionsHref}
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {recentTransactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No transactions yet</p>
            ) : (
              recentTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  id={tx.id}
                  description={tx.description}
                  merchant={tx.merchant}
                  amount={tx.amount}
                  date={tx.date}
                  category={tx.category}
                  account={!isAccountView ? tx.account : undefined}
                  transferAccount={tx.isTransfer ? tx.transferAccount : undefined}
                  debtAccount={tx.debtAccount}
                  isTransfer={tx.isTransfer}
                />
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Goals"
            subtitle={
              isAccountView ? `Goals linked to ${selectedAccountName}` : "Track your savings targets"
            }
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
            {goals.length === 0 ? (
              <p className="text-sm text-slate-500">No goals for this view yet.</p>
            ) : (
              goals.slice(0, 3).map((goal) => (
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
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Accounts"
          subtitle={`${dashboardAccounts.length} active accounts`}
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
          {dashboardAccounts.map((account) => (
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
