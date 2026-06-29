import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        padding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent = "indigo",
}: {
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  icon?: React.ReactNode;
  accent?: "indigo" | "green" | "red" | "purple" | "amber";
}) {
  const accentColors = {
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/20",
    green: "from-emerald-500 to-emerald-600 shadow-emerald-500/20",
    red: "from-rose-500 to-rose-600 shadow-rose-500/20",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {change && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium text-emerald-600">{change}</span>
              {changeLabel && ` ${changeLabel}`}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
              accentColors[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
