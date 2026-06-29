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
}: {
  isOpen: boolean;
  onClose: () => void;
  category?: CategoryRecord | null;
  defaultType?: "INCOME" | "EXPENSE";
  onSaved?: (category: CategoryRecord) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    icon: "tag",
    color: CATEGORY_COLORS[0],
    budgetable: true,
  });

  useEffect(() => {
    if (!isOpen) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const saved = await res.json();
      if (!res.ok) {
        alert(saved.error || "Failed to save category");
        return;
      }
      router.refresh();
      onSaved?.(normalizeCategory(saved));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category || !confirm(`Delete category "${category.name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete category");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? "Edit Category" : "Add Category"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="e.g. Groceries"
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
                className={`h-8 w-8 rounded-full transition-transform ${
                  form.color === color ? "scale-110 ring-2 ring-indigo-500 ring-offset-2" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.budgetable}
            onChange={(e) => setForm({ ...form, budgetable: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Include in budgets and envelopes
        </label>
        <div className="flex justify-between gap-3 pt-2">
          <div>
            {category && (
              <Button type="button" variant="danger" onClick={handleDelete} disabled={loading}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : category ? "Save Changes" : "Add Category"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
