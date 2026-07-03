"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryModal, type CategoryRecord } from "@/components/modals/category-modal";
import { normalizeCategory } from "@/lib/category-utils";

interface CategorySelectFieldProps {
  type: "INCOME" | "EXPENSE";
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
  emptyLabel?: string;
  required?: boolean;
  hint?: string | null;
}

export function CategorySelectField({
  type,
  value,
  onChange,
  label = "Category",
  emptyLabel = "Uncategorized",
  required = false,
  hint = null,
}: CategorySelectFieldProps) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<CategoryRecord | "new" | null>(null);

  const loadCategories = useCallback(() => {
    setLoading(true);
    return fetch(`/api/categories?type=${type}`)
      .then((r) => r.json())
      .then((data) => setCategories((data as Record<string, unknown>[]).map(normalizeCategory)))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === value) ?? null,
    [categories, value]
  );

  const options = useMemo(() => {
    const base = categories.map((category) => ({
      value: category.id,
      label: category.name,
    }));
    return required ? base : [{ value: "", label: emptyLabel }, ...base];
  }, [categories, emptyLabel, required]);

  const handleSaved = (category: CategoryRecord) => {
    setCategories((current) => {
      const existing = current.find((item) => item.id === category.id);
      if (existing) {
        return current.map((item) => (item.id === category.id ? category : item));
      }
      return [...current, category].sort((a, b) => a.name.localeCompare(b.name));
    });
    onChange(category.id);
    setModal(null);
  };

  return (
    <>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              options={options}
              disabled={loading}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setModal("new")}
            title={`Add ${type === "INCOME" ? "income" : "expense"} category`}
            className="shrink-0 px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {selectedCategory && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModal(selectedCategory)}
              title="Edit selected category"
              className="shrink-0 px-3"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {hint ?? `Add or edit ${type === "INCOME" ? "income" : "expense"} categories without leaving this form.`}
        </p>
      </div>

      <CategoryModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        category={modal === "new" ? null : modal}
        defaultType={type}
        onSaved={handleSaved}
        zIndex={60}
      />
    </>
  );
}
