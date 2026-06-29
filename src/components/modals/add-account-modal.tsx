"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ACCOUNT_COLORS, ACCOUNT_TYPES } from "@/lib/constants";
import {
  InstitutionFields,
  type InstitutionSelection,
  type SyncedAccountOption,
} from "@/components/institution-fields";
import { useRouter } from "next/navigation";

const defaultInstitution: InstitutionSelection = {
  institution: "",
  plaidItemId: null,
  plaidAccountId: null,
  syncedAccountId: null,
};

const defaultForm = {
  name: "",
  type: "CHECKING",
  balance: "0",
  color: ACCOUNT_COLORS[0],
};

export function AddAccountModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [institutionSelection, setInstitutionSelection] =
    useState<InstitutionSelection>(defaultInstitution);

  useEffect(() => {
    if (!isOpen) return;
    setForm(defaultForm);
    setInstitutionSelection(defaultInstitution);
  }, [isOpen]);

  const handleSyncedAccountPick = (account: SyncedAccountOption) => {
    setForm({
      name: account.name,
      type: account.type,
      balance: String(account.balance),
      color: ACCOUNT_COLORS[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = institutionSelection.plaidAccountId
        ? {
            plaidAccountId: institutionSelection.plaidAccountId,
            plaidItemId: institutionSelection.plaidItemId,
          }
        : {
            ...form,
            institution: institutionSelection.institution || null,
            plaidItemId: institutionSelection.plaidItemId,
          };

      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const usingSyncedAccount = Boolean(institutionSelection.plaidAccountId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InstitutionFields
          value={institutionSelection}
          onChange={setInstitutionSelection}
          onSyncedAccountPick={handleSyncedAccountPick}
          onManualEntry={() => setForm(defaultForm)}
        />
        <Input
          label="Account Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder={usingSyncedAccount ? "Auto-filled from synced account" : "e.g. Primary Checking"}
          readOnly={usingSyncedAccount}
        />
        <Select
          label="Account Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          disabled={usingSyncedAccount}
        />
        <Input
          label="Current Balance"
          type="number"
          step="0.01"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
          readOnly={usingSyncedAccount}
        />
        {!usingSyncedAccount && (
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
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || (usingSyncedAccount && !form.name)}>
            {loading ? "Adding..." : "Add Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
