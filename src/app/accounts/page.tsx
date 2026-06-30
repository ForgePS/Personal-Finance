import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { isLiability } from "@/lib/constants";
import { AccountsHeader } from "@/components/accounts-header";
import { ConnectBankSection } from "@/components/connect-bank-section";
import { EditableAccountsGrid } from "@/components/editable-accounts-grid";
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

      <ConnectBankSection />

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

      {accounts.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">No accounts yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Connect a bank above or use Add Account to get started.
          </p>
        </Card>
      ) : (
        <>
      {grouped.assets.length > 0 && (
        <div>
          <CardHeader title="Assets" subtitle="Accounts that grow your net worth" />
          <EditableAccountsGrid
              accounts={grouped.assets.map((account) => ({
                id: account.id,
                name: account.name,
                type: account.type,
                institution: account.institution,
                balance: account.balance,
                color: account.color,
                icon: account.icon,
                isArchived: account.isArchived,
                isLinked: account.isLinked,
                mask: account.mask,
              }))}
          />
        </div>
      )}

      {grouped.liabilities.length > 0 && (
        <div>
          <CardHeader title="Liabilities" subtitle="Debts and obligations" />
          <EditableAccountsGrid
            accounts={grouped.liabilities.map((account) => ({
              id: account.id,
              name: account.name,
              type: account.type,
              institution: account.institution,
              balance: account.balance,
              color: account.color,
              icon: account.icon,
              isArchived: account.isArchived,
              isLinked: account.isLinked,
              mask: account.mask,
            }))}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
}
