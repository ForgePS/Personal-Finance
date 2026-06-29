export const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Checking", icon: "landmark" },
  { value: "SAVINGS", label: "Savings", icon: "piggy-bank" },
  { value: "CREDIT_CARD", label: "Credit Card", icon: "credit-card" },
  { value: "INVESTMENT", label: "Investment", icon: "trending-up" },
  { value: "LOAN", label: "Loan", icon: "banknote" },
  { value: "CASH", label: "Cash", icon: "wallet" },
] as const;

export const ACCOUNT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export const CATEGORY_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#f43f5e",
  "#ec4899",
];

export const LIABILITY_TYPES = ["CREDIT_CARD", "LOAN"] as const;

export function isLiability(type: string): boolean {
  return (LIABILITY_TYPES as readonly string[]).includes(type);
}
