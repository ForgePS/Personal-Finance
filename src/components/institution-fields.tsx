"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";

export interface SyncedAccountOption {
  id: string;
  plaidAccountId: string;
  plaidItemId: string;
  existingAccountId: string | null;
  name: string;
  mask: string | null;
  type: string;
  balance: number;
  institutionName: string;
}

export interface InstitutionSelection {
  institution: string;
  plaidItemId: string | null;
  plaidAccountId: string | null;
  syncedAccountId: string | null;
}

interface InstitutionFieldsProps {
  value: InstitutionSelection;
  onChange: (value: InstitutionSelection) => void;
  onSyncedAccountPick?: (account: SyncedAccountOption) => void;
  onManualEntry?: () => void;
  disabled?: boolean;
}

const MANUAL_VALUE = "__manual__";

export function InstitutionFields({
  value,
  onChange,
  onSyncedAccountPick,
  onManualEntry,
  disabled = false,
}: InstitutionFieldsProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [syncedAccounts, setSyncedAccounts] = useState<SyncedAccountOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disabled) return;

    setLoading(true);
    fetch("/api/plaid/institutions")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured);
        setSyncedAccounts(data.accounts ?? []);
      })
      .finally(() => setLoading(false));
  }, [disabled]);

  const accountOptions = useMemo(
    () =>
      syncedAccounts.map((account) => ({
        value: account.plaidAccountId,
        label: `${account.institutionName} — ${account.name}${
          account.mask ? ` ·•••${account.mask}` : ""
        }`,
      })),
    [syncedAccounts]
  );

  const selectedValue = value.plaidAccountId
    ? value.plaidAccountId
    : value.institution && !value.plaidAccountId
      ? MANUAL_VALUE
      : "";

  const handleAccountChange = (plaidAccountId: string) => {
    if (plaidAccountId === MANUAL_VALUE) {
      onChange({
        institution: value.institution,
        plaidItemId: null,
        plaidAccountId: null,
        syncedAccountId: null,
      });
      onManualEntry?.();
      return;
    }

    const account = syncedAccounts.find((item) => item.plaidAccountId === plaidAccountId);
    if (!account) return;

    onChange({
      institution: account.institutionName,
      plaidItemId: account.plaidItemId,
      plaidAccountId: account.plaidAccountId,
      syncedAccountId: account.existingAccountId ?? account.id,
    });
    onSyncedAccountPick?.(account);
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading synced accounts...</p>;
  }

  if (configured === false || syncedAccounts.length === 0) {
    return (
      <div className="space-y-3">
        <Input
          label="Institution"
          value={value.institution}
          onChange={(e) =>
            onChange({
              institution: e.target.value,
              plaidItemId: null,
              plaidAccountId: null,
              syncedAccountId: null,
            })
          }
          placeholder="e.g. Chase"
          disabled={disabled}
        />
        {configured === false && (
          <p className="text-xs text-slate-500">
            Connect a bank on the{" "}
            <Link href="/accounts" className="font-medium text-indigo-600 hover:text-indigo-700">
              Accounts
            </Link>{" "}
            page to pick from synced accounts.
          </p>
        )}
        {configured && syncedAccounts.length === 0 && (
          <p className="text-xs text-slate-500">
            All synced accounts are already on your Accounts page, or no banks are connected yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        label="Institution"
        value={selectedValue}
        onChange={(e) => handleAccountChange(e.target.value)}
        options={[
          { value: "", label: "Select a synced account..." },
          ...accountOptions,
          { value: MANUAL_VALUE, label: "Manual account (enter details yourself)" },
        ]}
        disabled={disabled}
      />

      {selectedValue === MANUAL_VALUE && (
        <Input
          label="Institution Name"
          value={value.institution}
          onChange={(e) =>
            onChange({
              institution: e.target.value,
              plaidItemId: null,
              plaidAccountId: null,
              syncedAccountId: null,
            })
          }
          placeholder="e.g. Local Credit Union"
          disabled={disabled}
        />
      )}

      {value.plaidAccountId && value.institution && (
        <p className="text-xs text-slate-500">
          Account name, type, and balance will auto-fill from your selection.
        </p>
      )}
    </div>
  );
}
