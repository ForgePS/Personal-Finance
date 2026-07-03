import type { Metadata } from "next";
import { withServerAuth } from "@/lib/auth-server";
import { getDashboardData } from "@/lib/services";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { CashFlowChart, NetWorthBarChart } from "@/components/charts";

export const metadata: Metadata = {
  title: "Cash Flow | Money Command",
  description: "Analyze your income, expenses, and cash flow trends",
};

export const dynamic = "force-dynamic";

export default async function CashFlowPage() {
  return withServerAuth(async () => {
  const data = await getDashboardData();

  const avgIncome =
    data.cashFlowHistory.reduce((s, m) => s + m.income, 0) / data.cashFlowHistory.length;
  const avgExpenses =
    data.cashFlowHistory.reduce((s, m) => s + m.expenses, 0) / data.cashFlowHistory.length;
  const avgNet =
    data.cashFlowHistory.reduce((s, m) => s + m.net, 0) / data.cashFlowHistory.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cash Flow</h1>
        <p className="text-sm text-slate-500">Income, expenses, and net cash flow analysis</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Avg Monthly Income</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(avgIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Avg Monthly Expenses</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{formatCurrency(avgExpenses)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Avg Monthly Net</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              avgNet >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(avgNet)}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Income vs Expenses"
            subtitle="6-month trend"
          />
          <CashFlowChart data={data.cashFlowHistory} />
        </Card>
        <Card>
          <CardHeader
            title="Net Cash Flow"
            subtitle="Monthly surplus or deficit"
          />
          <NetWorthBarChart data={data.cashFlowHistory} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly Breakdown" subtitle="Detailed cash flow by month" />

        <div className="space-y-3 md:hidden">
          {data.cashFlowHistory.map((month) => {
            const savingsRate =
              month.income > 0 ? ((month.net / month.income) * 100).toFixed(1) : "0.0";
            return (
              <div
                key={month.month}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <p className="font-semibold text-slate-900">{month.month}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Income</p>
                    <p className="font-semibold tabular-nums text-emerald-600">
                      {formatCurrency(month.income)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Expenses</p>
                    <p className="font-semibold tabular-nums text-rose-600">
                      {formatCurrency(month.expenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Net</p>
                    <p
                      className={`font-semibold tabular-nums ${
                        month.net >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(month.net)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Savings Rate</p>
                    <p className="font-semibold tabular-nums text-slate-700">{savingsRate}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="pb-3 font-medium">Month</th>
                <th className="pb-3 font-medium text-right">Income</th>
                <th className="pb-3 font-medium text-right">Expenses</th>
                <th className="pb-3 font-medium text-right">Net</th>
                <th className="pb-3 font-medium text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.cashFlowHistory.map((month) => {
                const savingsRate =
                  month.income > 0 ? ((month.net / month.income) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={month.month} className="text-slate-900">
                    <td className="py-3 font-medium">{month.month}</td>
                    <td className="py-3 text-right tabular-nums text-emerald-600">
                      {formatCurrency(month.income)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-rose-600">
                      {formatCurrency(month.expenses)}
                    </td>
                    <td
                      className={`py-3 text-right tabular-nums font-semibold ${
                        month.net >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(month.net)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-slate-500">
                      {savingsRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
  });
}
