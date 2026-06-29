"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";

export interface SyncedAccountOption {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  balance: number;
}

export interface SyncedInstitution {
  id: string;
  name: string;
  accounts: SyncedAccountOption[];
}

export interface InstitutionSelection {
  institution: string;
  plaidItemId: string | null;
  syncedAccountId: string | null;
}

interface InstitutionFieldsProps {
  value: InstitutionSelection;
  onChange: (value: InstitutionSelection) => void;
  onSyncedAccountPick?: (account: SyncedAccountOption & { institutionName: string }) => void;
  disabled?: boolean;
}

const OTHER_VALUE = "__other__";

export function InstitutionFields({
  value,
  onChange,
  onSyncedAccountPick,
  disabled = false,
}: InstitutionFieldsProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [institutions, setInstitutions] = useState<SyncedInstitution[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disabled) return;

    setLoading(true);
    fetch("/api/plaid/institutions")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured);
        setInstitutions(data.institutions ?? []);
      })
      .finally(() => setLoading(false));
  }, [disabled]);

  const selectedInstitution = useMemo(
    () => institutions.find((item) => item.id === value.plaidItemId) ?? null,
    [institutions, value.plaidItemId]
  );

  const institutionOptions = useMemo(() => {
    const options = institutions.map((item) => ({
      value: item.id,
      label: `${item.name} (${item.accounts.length} synced account${item.accounts.length === 1 ? "" : "s"})`,
    }));

    options.push({ value: OTHER_VALUE, label: "Other (manual entry)" });
    return options;
  }, [institutions]);

  const institutionValue =
    value.plaidItemId && institutions.some((item) => item.id === value.plaidItemId)
      ? value.plaidItemId
      : value.institution
        ? OTHER_VALUE
        : "";

  const syncedAccountOptions = useMemo(() => {
    if (!selectedInstitution) return [];
    return selectedInstitution.accounts.map((account) => ({
      value: account.id,
      label: `${account.name}${account.mask ? ` ·•••${account.mask}` : ""}`,
    }));
  }, [selectedInstitution]);

  const handleInstitutionChange = (nextValue: string) => {
    if (nextValue === OTHER_VALUE) {
      onChange({
        institution: value.institution,
        plaidItemId: null,
        syncedAccountId: null,
      });
      return;
    }

    const institution = institutions.find((item) => item.id === nextValue);
    onChange({
      institution: institution?.name ?? "",
      plaidItemId: institution?.id ?? null,
      syncedAccountId: null,
    });
  };

  const handleSyncedAccountChange = (accountId: string) => {
    if (!selectedInstitution) return;

    const account = selectedInstitution.accounts.find((item) => item.id === accountId);
    if (!account) return;

    onChange({
      institution: selectedInstitution.name,
      plaidItemId: selectedInstitution.id,
      syncedAccountId: accountId,
    });

    onSyncedAccountPick?.({
      ...account,
      institutionName: selectedInstitution.name,
    });
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading synced institutions...</p>;
  }

  if (configured === false || institutions.length === 0) {
    return (
      <div className="space-y-3">
        <Input
          label="Institution"
          value={value.institution}
          onChange={(e) =>
            onChange({
              institution: e.target.value,
              plaidItemId: null,
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
            page to pick from synced institutions.
          </p>
        )}
        {configured && institutions.length === 0 && (
          <p className="text-xs text-slate-500">
            No synced institutions yet. Connect a bank to select from synced accounts.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        label="Institution"
        value={institutionValue}
        onChange={(e) => handleInstitutionChange(e.target.value)}
        options={[{ value: "", label: "Select a synced institution..." }, ...institutionOptions]}
        disabled={disabled}
      />

      {institutionValue === OTHER_VALUE && (
        <Input
          label="Institution Name"
          value={value.institution}
          onChange={(e) =>
            onChange({
              institution: e.target.value,
              plaidItemId: null,
              syncedAccountId: null,
            })
          }
          placeholder="e.g. Local Credit Union"
          disabled={disabled}
        />
      )}

      {selectedInstitution && syncedAccountOptions.length > 0 && (
        <Select
          label="Synced Account (optional)"
          value={value.syncedAccountId ?? ""}
          onChange={(e) => handleSyncedAccountChange(e.target.value)}
          options={[
            { value: "", label: "Choose a synced account to pre-fill..." },
            ...syncedAccountOptions,
          ]}
          disabled={disabled}
        />
      )}

      <p className="text-xs text-slate-500">
        Pick a connected institution and optionally select a synced account to pre-fill details.
      </p>
    </div>
  );
}
