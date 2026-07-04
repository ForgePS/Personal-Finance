"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  onItemClick,
}: {
  data: { name: string; amount: number }[];
  onItemClick?: (name: string) => void;
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
            <li key={slice.name}>
              {onItemClick ? (
                <button
                  type="button"
                  onClick={() => onItemClick(slice.name)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
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
                </button>
              ) : (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-lg px-2 py-2 hover:bg-slate-50">
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
                </div>
              )}
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

export interface ForecastTimelinePoint {
  month: string;
  income: number;
  expenses: number;
  scheduledExpenses: number;
  variableExpenses: number;
  isForecast: boolean;
}

export function AnalyticsForecastChart({ data }: { data: ForecastTimelinePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value, name) => [
            `$${Number(value).toLocaleString()}`,
            name === "scheduledExpenses"
              ? "Scheduled"
              : name === "variableExpenses"
                ? "Variable (est.)"
                : String(name),
          ]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        />
        <Legend />
        <Bar
          dataKey="scheduledExpenses"
          stackId="expenses"
          fill="#f43f5e"
          name="Scheduled expenses"
          radius={[0, 0, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`sched-${index}`}
              fill={entry.isForecast ? "#fb7185" : "#f43f5e"}
              fillOpacity={entry.isForecast ? 0.65 : 1}
            />
          ))}
        </Bar>
        <Bar
          dataKey="variableExpenses"
          stackId="expenses"
          fill="#fda4af"
          name="Variable (est.)"
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`var-${index}`}
              fill={entry.isForecast ? "#fecdd3" : "#fda4af"}
              fillOpacity={entry.isForecast ? 0.65 : 1}
            />
          ))}
        </Bar>
        <Area
          type="monotone"
          dataKey="income"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.15}
          strokeWidth={2}
          name="Income"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CategoryComparisonChart({
  data,
}: {
  data: { name: string; current: number; average: number; predicted: number; color: string }[];
}) {
  const top = data.slice(0, 8);
  if (top.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
        No category spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, top.length * 36)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => `$${Number(value).toLocaleString()}`}
          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
        />
        <Legend />
        <Bar dataKey="average" fill="#cbd5e1" name="12-mo avg" radius={[0, 4, 4, 0]} />
        <Bar dataKey="current" name="This month">
          {top.map((entry) => (
            <Cell key={`cur-${entry.name}`} fill={entry.color} />
          ))}
        </Bar>
        <Bar dataKey="predicted" fill="#818cf8" name="Next month (est.)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsRateChart({
  data,
}: {
  data: { month: string; rate: number; isForecast: boolean }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "Savings rate"]}
          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="#6366f1"
          fill="url(#savingsGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
