"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants";
import { normalizeCategory } from "@/lib/category-utils";
import { useRouter } from "next/navigation";

export interface CategoryRecord {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  budgetable: boolean;
  parentId?: string | null;
}

export function CategoryModal({
  isOpen,
  onClose,
  category,
  defaultType = "EXPENSE",
  onSaved,
  zIndex = 50,
}: {
  isOpen: boolean;
  onClose: () => void;
  category?: CategoryRecord | null;
  defaultType?: "INCOME" | "EXPENSE";
  onSaved?: (category: CategoryRecord) => void;
  zIndex?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    icon: "tag",
    color: CATEGORY_COLORS[0],
    budgetable: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (category) {
      setForm({
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        budgetable: category.budgetable !== false,
      });
    } else {
      setForm({
        name: "",
        type: defaultType,
        icon: "tag",
        color: CATEGORY_COLORS[0],
        budgetable: true,
      });
    }
  }, [isOpen, category, defaultType]);

  const saveCategory = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Category name is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = { ...form, name: trimmedName };
      const res = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();
      if (!res.ok) {
        setError(saved.error || "Failed to save category");
        return;
      }
      router.refresh();
      onSaved?.(normalizeCategory(saved));
      onClose();
    } catch {
      setError("Could not save category. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category || !confirm(`Delete category "${category.name}"?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete category");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Could not delete category. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? "Edit Category" : "Add Category"}
      zIndex={zIndex}
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="e.g. Groceries"
          autoComplete="off"
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as "INCOME" | "EXPENSE" })
          }
          options={[
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
          ]}
        />
        <Select
          label="Icon"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          options={CATEGORY_ICONS.map((i) => ({ value: i.value, label: i.label }))}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Color</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm({ ...form, color })}
                className={`h-10 w-10 rounded-full transition-transform touch-manipulation ${
                  form.color === color ? "scale-110 ring-2 ring-indigo-500 ring-offset-2" : ""
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.budgetable}
            onChange={(e) => setForm({ ...form, budgetable: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Include in budgets and envelopes
        </label>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white px-4 pt-4 sm:-mx-6 sm:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {category && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={loading}
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  void saveCategory();
                }}
              >
                {loading ? "Saving..." : category ? "Save Changes" : "Add Category"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
