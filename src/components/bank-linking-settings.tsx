"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function BankLinkingSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    secret: "",
    env: "sandbox",
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/settings/plaid")
      .then((r) => r.json())
      .then((data) => {
        setForm((f) => ({
          ...f,
          clientId: data.clientId ?? "",
          env: data.env ?? "sandbox",
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/plaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setMessage("Plaid keys saved. Go to Accounts to connect your bank.");
      setForm((f) => ({ ...f, secret: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Bank Linking (Plaid)"
        subtitle="Paste your Plaid sandbox keys here — no Google Secret Manager needed"
      />
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-sm text-slate-600">
            Get free sandbox keys from{" "}
            <a
              href="https://dashboard.plaid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline"
            >
              dashboard.plaid.com
            </a>{" "}
            → Team Settings → Keys. Use the <strong>Sandbox</strong> client_id and secret.
          </p>
          <Input
            label="Plaid Client ID"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            required
            placeholder="Paste sandbox client_id"
          />
          <Input
            label="Plaid Secret"
            type="password"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
            required
            placeholder="Paste sandbox secret"
          />
          <Select
            label="Environment"
            value={form.env}
            onChange={(e) => setForm({ ...form, env: e.target.value })}
            options={[
              { value: "sandbox", label: "Sandbox (testing)" },
              { value: "development", label: "Development" },
              { value: "production", label: "Production" },
            ]}
          />
          <p className="text-xs text-slate-500">
            Keys are stored in your private Firestore database. After saving, use{" "}
            <Link href="/accounts" className="font-medium text-indigo-600 underline">
              Accounts → Connect Bank
            </Link>
            . Sandbox login: <strong>user_good</strong> / <strong>pass_good</strong>
          </p>
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Plaid Keys"}
          </Button>
        </form>
      )}
    </Card>
  );
}
