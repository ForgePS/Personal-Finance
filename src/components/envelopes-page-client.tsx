"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMonths, subMonths } from "date-fns";
import { EnvelopeCard, type EnvelopeData } from "@/components/envelope-card";
import { EnvelopePoolBanner } from "@/components/envelope-pool-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatShortDate, getMonthKey } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  FundEnvelopeModal,
  TransferEnvelopeModal,
  ReturnToPoolModal,
  EditPoolModal,
  CreateEnvelopeModal,
  FundPoolFromAccountsModal,
  ReconcileEnvelopeModal,
  SetEnvelopeBudgetModal,
  ResetEnvelopeMonthModal,
} from "@/components/modals/envelope-modals";
import { ChevronLeft, ChevronRight, Mail, Plus, RotateCcw } from "lucide-react";

interface Transfer {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  from: string;
  to: string;
}

interface PoolFunding {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  accountName: string;
}

interface UncategorizedTransaction {
  id: string;
  description: string;
  merchant: string | null;
  amount: number;
  date: string;
  accountName: string;
  isMatched: boolean;
}

interface AvailableCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface EnvelopesPageClientProps {
  monthKey: string;
  pool: {
    totalFunds: number;
    totalAllocated: number;
    totalBudgeted: number;
    totalSpent: number;
    unallocated: number;
    spendingStartDate?: string | null;
  };
  envelopes: EnvelopeData[];
  recentTransfers: Transfer[];
  recentPoolFundings: PoolFunding[];
  uncategorizedTransactions: UncategorizedTransaction[];
  availableCategories: AvailableCategory[];
  overspentCount: number;
  overBudgetCount: number;
}

export function EnvelopesPageClient({
  monthKey,
  pool,
  envelopes,
  recentTransfers,
  recentPoolFundings,
  uncategorizedTransactions,
  availableCategories,
  overspentCount,
  overBudgetCount,
}: EnvelopesPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const monthDate = useMemo(() => new Date(`${monthKey}-01T12:00:00`), [monthKey]);
  const [editPoolOpen, setEditPoolOpen] = useState(false);
  const [fundPoolOpen, setFundPoolOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [fundModal, setFundModal] = useState<EnvelopeData | null>(null);
  const [transferModal, setTransferModal] = useState<EnvelopeData | null>(null);
  const [returnModal, setReturnModal] = useState<EnvelopeData | null>(null);
  const [reconcileModal, setReconcileModal] = useState<EnvelopeData | null>(null);
  const [budgetModal, setBudgetModal] = useState<EnvelopeData | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const envelopeOptions = envelopes.map((e) => ({
    categoryId: e.categoryId,
    name: e.category.name,
    remaining: e.remaining,
  }));

  const navigateMonth = (direction: -1 | 1) => {
    const next = direction === 1 ? addMonths(monthDate, 1) : subMonths(monthDate, 1);
    startTransition(() => {
      router.push(`/envelopes?month=${getMonthKey(next)}`);
    });
  };

  const handleMonthPick = (value: string) => {
    if (!value) return;
    startTransition(() => {
      router.push(`/envelopes?month=${value}`);
    });
  };

  const handleRemoveEnvelope = async (envelope: EnvelopeData) => {
    if (!confirm(`Remove the ${envelope.category.name} envelope?`)) return;
    const res = await fetch("/api/envelopes/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deactivate-envelope",
        envelopeId: envelope.id,
        month: monthKey,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to remove envelope");
      return;
    }
    router.refresh();
  };

  return (
    <div className={cn("space-y-8", isPending && "pointer-events-none opacity-60")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Mail className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Envelope Budget</h1>
            <p className="text-sm text-slate-500">
              Fund from accounts, allocate to envelopes, reconcile against transactions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <label className="sr-only" htmlFor="envelope-month">
            Month
          </label>
          <input
            id="envelope-month"
            type="month"
            value={monthKey}
            onChange={(e) => handleMonthPick(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <Button variant="secondary" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Fresh Start
          </Button>
        </div>
      </div>

      {pool.spendingStartDate && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          Counting spending from {formatShortDate(pool.spendingStartDate)} onward. Earlier
          transactions in this month are ignored for envelope tracking.{" "}
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="font-medium underline hover:text-indigo-900"
          >
            Change
          </button>
        </div>
      )}

      <EnvelopePoolBanner
        totalFunds={pool.totalFunds}
        totalAllocated={pool.totalAllocated}
        totalBudgeted={pool.totalBudgeted}
        totalSpent={pool.totalSpent}
        unallocated={pool.unallocated}
        onFundFromAccounts={() => setFundPoolOpen(true)}
        onEditPool={() => setEditPoolOpen(true)}
      />

      {overspentCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {overspentCount} {overspentCount === 1 ? "envelope is" : "envelopes are"} overspent
          (spent more than allocated). Move money from another envelope, add pool funds, or review
          reconciled transactions.
        </div>
      )}

      {overBudgetCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {overBudgetCount} {overBudgetCount === 1 ? "envelope is" : "envelopes are"} over its
          monthly budget. Review spending or adjust the budget target.
        </div>
      )}

      {uncategorizedTransactions.length > 0 && (
        <Card>
          <CardHeader
            title="Uncategorized Expenses"
            subtitle={`${uncategorizedTransactions.length} transactions need a category to reconcile with envelopes`}
          />
          <div className="divide-y divide-slate-100">
            {uncategorizedTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{tx.description}</p>
                  <p className="text-xs text-slate-500">
                    {tx.accountName} · {formatShortDate(tx.date)}
                  </p>
                </div>
                <span className="font-semibold text-rose-600">{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Open an envelope&apos;s Reconcile view to assign these transactions.
          </p>
        </Card>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <CardHeader
            title="Your Envelopes"
            subtitle={`${envelopes.length} active envelope${envelopes.length === 1 ? "" : "s"}`}
          />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Envelope
          </Button>
        </div>

        {envelopes.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">No envelopes yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Fund your pool from accounts, then create envelopes for the categories you want to
              track.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Envelope
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {envelopes.map((envelope) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                onFund={() => setFundModal(envelope)}
                onTransfer={() => setTransferModal(envelope)}
                onReturn={() => setReturnModal(envelope)}
                onReconcile={() => setReconcileModal(envelope)}
                onSetBudget={() => setBudgetModal(envelope)}
                onRemove={() => handleRemoveEnvelope(envelope)}
              />
            ))}
          </div>
        )}
      </div>

      {recentPoolFundings.length > 0 && (
        <Card>
          <CardHeader title="Pool Funding" subtitle="Money added from your accounts" />
          <div className="divide-y divide-slate-100">
            {recentPoolFundings.map((funding) => (
              <div key={funding.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{funding.accountName}</p>
                  {funding.note && <p className="text-xs text-slate-500">{funding.note}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-emerald-600">
                    +{formatCurrency(funding.amount)}
                  </p>
                  <p className="text-xs text-slate-400">{formatShortDate(funding.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {recentTransfers.length > 0 && (
        <Card>
          <CardHeader title="Envelope Movements" subtitle="Transfers between envelopes and pool" />
          <div className="divide-y divide-slate-100">
            {recentTransfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {transfer.from} → {transfer.to}
                  </p>
                  {transfer.note && <p className="text-xs text-slate-500">{transfer.note}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-indigo-600">
                    {formatCurrency(transfer.amount)}
                  </p>
                  <p className="text-xs text-slate-400">{formatShortDate(transfer.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <CreateEnvelopeModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        availableCategories={availableCategories}
        monthKey={monthKey}
      />

      <FundPoolFromAccountsModal
        isOpen={fundPoolOpen}
        onClose={() => setFundPoolOpen(false)}
        monthKey={monthKey}
      />

      <EditPoolModal
        isOpen={editPoolOpen}
        onClose={() => setEditPoolOpen(false)}
        currentTotal={pool.totalFunds}
        monthKey={monthKey}
      />

      {fundModal && (
        <FundEnvelopeModal
          isOpen={!!fundModal}
          onClose={() => setFundModal(null)}
          categoryId={fundModal.categoryId}
          categoryName={fundModal.category.name}
          unallocated={pool.unallocated}
          budgetAmount={fundModal.budgetAmount}
          allocated={fundModal.allocated}
          monthKey={monthKey}
        />
      )}

      {budgetModal && (
        <SetEnvelopeBudgetModal
          isOpen={!!budgetModal}
          onClose={() => setBudgetModal(null)}
          envelopeId={budgetModal.id}
          categoryName={budgetModal.category.name}
          currentBudget={budgetModal.budgetAmount}
          allocated={budgetModal.allocated}
          monthKey={monthKey}
        />
      )}

      {transferModal && (
        <TransferEnvelopeModal
          isOpen={!!transferModal}
          onClose={() => setTransferModal(null)}
          fromCategoryId={transferModal.categoryId}
          fromCategoryName={transferModal.category.name}
          fromRemaining={transferModal.remaining}
          envelopes={envelopeOptions}
          monthKey={monthKey}
        />
      )}

      {returnModal && (
        <ReturnToPoolModal
          isOpen={!!returnModal}
          onClose={() => setReturnModal(null)}
          categoryId={returnModal.categoryId}
          categoryName={returnModal.category.name}
          remaining={returnModal.remaining}
          monthKey={monthKey}
        />
      )}

      {reconcileModal && (
        <ReconcileEnvelopeModal
          isOpen={!!reconcileModal}
          onClose={() => setReconcileModal(null)}
          categoryId={reconcileModal.categoryId}
          categoryName={reconcileModal.category.name}
          transactions={reconcileModal.transactions}
          uncategorizedTransactions={uncategorizedTransactions}
          monthKey={monthKey}
        />
      )}

      <ResetEnvelopeMonthModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        monthKey={monthKey}
        spendingStartDate={pool.spendingStartDate}
      />
    </div>
  );
}
