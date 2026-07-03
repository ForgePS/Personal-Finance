import type { Metadata } from "next";
import { withServerAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { getDashboardData } from "@/lib/services";
import { resolveDashboardAccountId } from "@/lib/dashboard-accounts";
import { getTransactionDisplayAmountForAccount } from "@/lib/debt-payment-service";
import { DashboardPageClient } from "@/components/dashboard-page-client";
import { formatDateKey, toIsoString } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard | Money Command",
  description: "Your personal finance command center",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  return withServerAuth(async () => {
  const { accountId: accountIdParam } = await searchParams;

  const accounts = await db.account.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });

  const accountId = resolveDashboardAccountId(accounts, accountIdParam);
  const data = await getDashboardData(undefined, accountId);

  return (
    <DashboardPageClient
      accountId={data.accountId}
      selectedAccountName={data.selectedAccount?.name ?? null}
      accounts={accounts}
      netWorth={data.netWorth}
      accountBalance={data.accountBalance}
      income={data.income}
      expenses={data.expenses}
      savings={data.savings}
      categorySpending={data.categorySpending}
      cashFlowHistory={data.cashFlowHistory}
      recentTransactions={data.recentTransactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        merchant: tx.merchant,
        amount: data.accountId
          ? getTransactionDisplayAmountForAccount(tx, data.accountId)
          : tx.amount,
        date: formatDateKey(tx.date),
        isTransfer: tx.isTransfer,
        category: tx.category,
        account: tx.account ? { name: tx.account.name, color: tx.account.color } : null,
        transferAccount: tx.transferAccount
          ? { name: tx.transferAccount.name, color: tx.transferAccount.color }
          : null,
        debtAccount: tx.debtAccount
          ? { name: tx.debtAccount.name, color: tx.debtAccount.color }
          : null,
      }))}
      goals={data.goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: toIsoString(goal.targetDate),
        icon: goal.icon,
        color: goal.color,
        account: goal.account ? { name: goal.account.name } : null,
      }))}
      dashboardAccounts={data.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        institution: account.institution,
        balance: account.balance,
        color: account.color,
        icon: account.icon,
      }))}
    />
  );
  });
}
