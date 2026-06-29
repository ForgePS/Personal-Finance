import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { isLiability } from "@/lib/constants";
import { AccountCard } from "@/components/account-card";
import { AccountsHeader } from "@/components/accounts-header";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Accounts | Money Command",
  description: "Manage your financial accounts",
};

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await db.account.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
  });

  const assets = accounts
    .filter((a) => !isLiability(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  const liabilities = accounts
    .filter((a) => isLiability(a.type))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const grouped = {
    assets: accounts.filter((a) => !isLiability(a.type)),
    liabilities: accounts.filter((a) => isLiability(a.type)),
  };

  return (
    <div className="space-y-8">
      <AccountsHeader />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Assets</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(assets)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Liabilities</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{formatCurrency(liabilities)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Net Worth</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {formatCurrency(assets - liabilities)}
          </p>
        </Card>
      </div>

      {grouped.assets.length > 0 && (
        <div>
          <CardHeader title="Assets" subtitle="Accounts that grow your net worth" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.assets.map((account) => (
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
        </div>
      )}

      {grouped.liabilities.length > 0 && (
        <div>
          <CardHeader title="Liabilities" subtitle="Debts and obligations" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.liabilities.map((account) => (
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
        </div>
      )}
    </div>
  );
}
