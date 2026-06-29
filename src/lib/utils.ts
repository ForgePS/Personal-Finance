import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${amount < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${amount < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  const d =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)
      ? parseLocalDate(date)
      : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatMonthYear(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getMonthKey(date: Date | string): string {
  const d =
    typeof date === "string" && /^\d{4}-\d{2}$/.test(date)
      ? parseMonthKey(date)
      : date instanceof Date
        ? date
        : parseLocalDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

/** Local calendar date key (YYYY-MM-DD) — avoids UTC shifts from toISOString() */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse date-only strings as local midnight */
export function parseLocalDate(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/** Parse YYYY-MM or YYYY-MM-DD (or ISO) as a local month start */
export function parseEnvelopeMonthInput(value: string): Date {
  if (/^\d{4}-\d{2}$/.test(value)) {
    return parseMonthKey(value);
  }
  const local = parseLocalDate(value);
  return new Date(local.getFullYear(), local.getMonth(), 1);
}

/** Normalize Date or ISO string from Firestore/Prisma for serialization */
export function toIsoString(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function toIsoStringRequired(value: Date | string): string {
  if (typeof value === "string") return value;
  return value.toISOString();
}
