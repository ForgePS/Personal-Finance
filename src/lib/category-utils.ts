import type { CategoryRecord } from "@/components/modals/category-modal";

export function normalizeCategory(category: Record<string, unknown>): CategoryRecord {
  return {
    id: String(category.id),
    name: String(category.name ?? ""),
    type: String(category.type).toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
    icon: String(category.icon ?? "tag"),
    color: String(category.color ?? "#8b5cf6"),
    budgetable: category.budgetable !== false,
    parentId: category.parentId != null ? String(category.parentId) : null,
  };
}
