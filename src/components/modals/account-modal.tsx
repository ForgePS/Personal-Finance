"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ACCOUNT_COLORS, ACCOUNT_TYPES } from "@/lib/constants";
import { InstitutionFields, type InstitutionSelection } from "@/components/institution-fields";
import { useRouter } from "next/navigation";

export interface AccountRecord {
  id: string;
  name: string;
  type: string;
  institution?: string | null;
  balance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  isLinked: boolean;
  plaidItemId?: string | null;
}

export function AccountModal({
  isOpen,
  onClose,
  account,
}: {
  isOpen: boolean;
  onClose: () => void;
  account?: AccountRecord | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "CHECKING",
    balance: "0",
    color: ACCOUNT_COLORS[0],
    isArchived: false,
  });
  const [institutionSelection, setInstitutionSelection] = useState<InstitutionSelection>({
    institution: "",
    plaidItemId: null,
    syncedAccountId: null,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      setForm({
        name: account.name,
        type: account.type,
        balance: String(account.balance),
        color: account.color,
        isArchived: account.isArchived,
      });
      setInstitutionSelection({
        institution: account.institution ?? "",
        plaidItemId: account.plaidItemId ?? null,
        syncedAccountId: null,
      });
    } else {
      setForm({
        name: "",
        type: "CHECKING",
        balance: "0",
        color: ACCOUNT_COLORS[0],
        isArchived: false,
      });
      setInstitutionSelection({
        institution: "",
        plaidItemId: null,
        syncedAccountId: null,
      });
    }
  }, [isOpen, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(account ? `/api/accounts/${account.id}` : "/api/accounts", {
        method: account ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          institution: institutionSelection.institution || null,
          plaidItemId: institutionSelection.plaidItemId,
        }),
      });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    if (account.isLinked) {
      alert("Cannot delete a linked bank account. Disconnect it from Accounts first.");
      return;
    }
    if (!confirm(`Delete account "${account.name}"? This removes all its transactions.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={account ? "Edit Account" : "Add Account"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {account?.isLinked ? (
          <Input
            label="Institution"
            value={account.institution ?? ""}
            disabled
          />
        ) : (
          <InstitutionFields
            value={institutionSelection}
            onChange={setInstitutionSelection}
            onSyncedAccountPick={(syncedAccount) => {
              setForm((current) => ({
                ...current,
                name: syncedAccount.name,
                type: syncedAccount.type,
                balance: String(syncedAccount.balance),
              }));
            }}
          />
        )}
        <Input
          label="Account Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Select
          label="Account Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          disabled={account?.isLinked}
        />
        <Input
          label="Current Balance"
          type="number"
          step="0.01"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
          disabled={account?.isLinked}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Color</label>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_COLORS.map((color) => (
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
        {account && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isArchived}
              onChange={(e) => setForm({ ...form, isArchived: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Archived (hide from active lists)
          </label>
        )}
        <div className="flex justify-between gap-3 pt-2">
          <div>
            {account && !account.isLinked && (
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
              {loading ? "Saving..." : account ? "Save Changes" : "Add Account"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
