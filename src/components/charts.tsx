"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#eab308",
  "#f43f5e",
  "#14b8a6",
  "#3b82f6",
  "#64748b",
];

interface SpendingSlice {
  name: string;
  amount: number;
  color: string;
  percent: number;
}

function buildSpendingSlices(data: { name: string; amount: number }[]): SpendingSlice[] {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  return [...data]
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      name: item.name,
      amount: item.amount,
      color: COLORS[index % COLORS.length],
      percent: total > 0 ? (item.amount / total) * 100 : 0,
    }));
}

function SpendingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SpendingSlice }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-slate-900">{item.name}</p>
      <p className="mt-0.5 text-sm tabular-nums text-slate-600">
        {formatCurrency(item.amount)}{" "}
        <span className="text-slate-400">· {item.percent.toFixed(1)}%</span>
      </p>
    </div>
  );
}

export function CashFlowChart({
  data,
}: {
  data: { month: string; income: number; expenses: number; net: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#22c55e"
          fill="url(#incomeGrad)"
          strokeWidth={2}
          name="Income"
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#f43f5e"
          fill="url(#expenseGrad)"
          strokeWidth={2}
          name="Expenses"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendingPieChart({
  data,
}: {
  data: { name: string; amount: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
        No spending data for this period
      </div>
    );
  }

  const slices = buildSpendingSlices(data);
  const total = slices.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="relative mx-auto h-[220px] w-[220px] shrink-0 lg:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={98}
              paddingAngle={2}
              dataKey="amount"
              nameKey="name"
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<SpendingTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <ul className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
          {slices.map((slice) => (
            <li
              key={slice.name}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-lg px-2 py-2 hover:bg-slate-50"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="truncate text-sm font-medium text-slate-700">{slice.name}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCurrency(slice.amount)}
              </span>
              <span className="w-12 text-right text-xs font-medium tabular-nums text-slate-500">
                {slice.percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function NetWorthBarChart({
  data,
}: {
  data: { month: string; net: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Net Cash Flow"]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        />
        <Bar dataKey="net" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.net >= 0 ? "#22c55e" : "#f43f5e"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
