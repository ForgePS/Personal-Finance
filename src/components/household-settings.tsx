"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";

type HouseholdMember = {
  id: string;
  email: string;
  role: string;
  userId: string;
};

type HouseholdInvite = {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
};

type HouseholdData = {
  tenant: { id: string; name: string };
  currentMember: { id: string; role: string; email: string; userId?: string } | null;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
};

export function HouseholdSettings() {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/household");
      if (!res.ok) throw new Error("Failed to load household");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load household");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage =
    data?.currentMember?.role === "OWNER" || data?.currentMember?.role === "ADMIN";

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to send invite");
      setInviteUrl(body.inviteUrl);
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setBusy(false);
    }
  };

  const copyInviteUrl = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
  };

  const revokeInvite = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/household/invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to revoke invite");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this person from your household? They will lose access to shared finances.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/household/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to remove member");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500">Loading household...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={data?.tenant.name ?? "Household"}
          subtitle="People in your household share the same accounts, transactions, and budgets. Data is never shared with other households."
        />

        <div className="space-y-3 px-6 pb-6">
          {data?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{member.email}</p>
                <p className="text-xs capitalize text-slate-500">{member.role.toLowerCase()}</p>
              </div>
              {canManage && member.role !== "OWNER" && member.id !== data.currentMember?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMember(member.id)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {canManage && (
        <Card>
          <CardHeader
            title="Invite someone"
            subtitle="Send an invite link so a partner or family member can join your household and see the same finances."
          />

          <form onSubmit={handleInvite} className="space-y-4 px-6 pb-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
              <Button type="submit" disabled={busy}>
                Send invite
              </Button>
            </div>

            {inviteUrl && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-sm font-medium text-emerald-900">Invite link created</p>
                <p className="mb-3 break-all text-xs text-emerald-800">{inviteUrl}</p>
                <Button type="button" variant="secondary" size="sm" onClick={copyInviteUrl}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            )}
          </form>
        </Card>
      )}

      {canManage && (data?.invites.length ?? 0) > 0 && (
        <Card>
          <CardHeader title="Pending invites" />
          <div className="space-y-3 px-6 pb-6">
            {data?.invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{invite.email}</p>
                  <p className="text-xs text-slate-500">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeInvite(invite.id)}
                  disabled={busy}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
