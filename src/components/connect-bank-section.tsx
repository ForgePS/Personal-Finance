"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Landmark, Loader2, RefreshCw, Unplug, AlertCircle } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ConnectedAccount {
  id: string;
  name: string;
  mask: string | null;
  balance: number;
  type: string;
  lastSyncedAt: string | null;
}

interface ConnectedBank {
  id: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
  accounts: ConnectedAccount[];
}

export function ConnectBankSection() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectedBank[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchConnections = useCallback(async () => {
    const res = await fetch("/api/plaid/connections");
    const data = await res.json();
    setConfigured(data.configured);
    setConnections(data.items ?? []);
  }, []);

  const fetchLinkToken = useCallback(async () => {
    setError("");
    const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || data.error || "Failed to initialize bank linking");
      return;
    }
    setLinkToken(data.link_token);
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token,
            institution: metadata.institution
              ? {
                  name: metadata.institution.name,
                  institution_id: metadata.institution.institution_id,
                }
              : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to connect bank");
        setSuccess(data.message || "Bank connected!");
        setLinkToken(null);
        router.refresh();
        await fetchConnections();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setLoading(false);
      }
    },
    [router, fetchConnections]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const handleConnect = () => {
    if (linkToken && ready) {
      open();
    } else {
      fetchLinkToken();
    }
  };

  const handleSync = async (itemId: string) => {
    setSyncing(itemId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/plaid/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSuccess(`Synced ${data.accountsSynced} accounts and ${data.transactionsSynced} transactions`);
      router.refresh();
      await fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (itemId: string, name: string) => {
    if (!confirm(`Disconnect ${name}? Linked accounts will be archived.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/plaid/connections/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disconnect failed");
      setSuccess("Bank disconnected");
      router.refresh();
      await fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  };

  if (configured === null) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Connect Your Banks</h2>
              <p className="text-sm text-slate-500">
                Securely link accounts to automatically import balances and transactions
              </p>
            </div>
          </div>
          <Button onClick={handleConnect} disabled={loading || !configured}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Landmark className="h-4 w-4" />
            )}
            {loading ? "Connecting..." : "Connect Bank"}
          </Button>
        </div>

        {!configured && (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Plaid setup required</p>
              <p className="mt-1 text-amber-800">
                To connect real banks, add your Plaid API keys to <code className="rounded bg-amber-100 px-1">.env</code>:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-amber-100/50 p-3 text-xs">
{`PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox`}
              </pre>
              <p className="mt-2 text-amber-800">
                Get free sandbox keys at{" "}
                <a
                  href="https://dashboard.plaid.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  dashboard.plaid.com
                </a>
                . In sandbox mode, use credentials like <strong>user_good</strong> / <strong>pass_good</strong>.
              </p>
            </div>
          </div>
        )}

        {configured && (
          <p className="mt-4 text-xs text-slate-500">
            Powered by Plaid · Bank-level encryption · Read-only access to balances and transactions
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {connections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Connected Institutions</h3>
          {connections.map((bank) => (
            <div
              key={bank.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {bank.institutionName || "Connected Bank"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {bank.accounts.length} account{bank.accounts.length !== 1 ? "s" : ""}
                    {bank.lastSyncedAt && ` · Last synced ${formatShortDate(bank.lastSyncedAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSync(bank.id)}
                    disabled={syncing === bank.id}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", syncing === bank.id && "animate-spin")} />
                    Sync
                  </button>
                  <button
                    onClick={() => handleDisconnect(bank.id, bank.institutionName || "bank")}
                    className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {bank.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">
                      {account.name}
                      {account.mask && <span className="text-slate-400"> ·•••{account.mask}</span>}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
