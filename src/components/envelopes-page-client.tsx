"use client";

import { useState } from "react";
import { EnvelopeCard, type EnvelopeData } from "@/components/envelope-card";
import { EnvelopePoolBanner } from "@/components/envelope-pool-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatMonthYear, formatShortDate } from "@/lib/utils";
import {
  FundEnvelopeModal,
  TransferEnvelopeModal,
  ReturnToPoolModal,
  EditPoolModal,
} from "@/components/modals/envelope-modals";
import { Mail } from "lucide-react";

interface Transfer {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  from: string;
  to: string;
}

interface EnvelopesPageClientProps {
  month: string;
  pool: {
    totalFunds: number;
    totalAllocated: number;
    totalSpent: number;
    unallocated: number;
  };
  envelopes: EnvelopeData[];
  recentTransfers: Transfer[];
  overspentCount: number;
}

export function EnvelopesPageClient({
  month,
  pool,
  envelopes,
  recentTransfers,
  overspentCount,
}: EnvelopesPageClientProps) {
  const monthDate = new Date(month);
  const [editPoolOpen, setEditPoolOpen] = useState(false);
  const [fundModal, setFundModal] = useState<EnvelopeData | null>(null);
  const [transferModal, setTransferModal] = useState<EnvelopeData | null>(null);
  const [returnModal, setReturnModal] = useState<EnvelopeData | null>(null);

  const envelopeOptions = envelopes.map((e) => ({
    categoryId: e.categoryId,
    name: e.category.name,
    remaining: e.remaining,
  }));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Mail className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Envelope Budget</h1>
            <p className="text-sm text-slate-500">
              {formatMonthYear(monthDate)} — separate your money into spending categories
            </p>
          </div>
        </div>
      </div>

      <EnvelopePoolBanner
        totalFunds={pool.totalFunds}
        totalAllocated={pool.totalAllocated}
        totalSpent={pool.totalSpent}
        unallocated={pool.unallocated}
        onEditPool={() => setEditPoolOpen(true)}
      />

      {overspentCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {overspentCount} {overspentCount === 1 ? "envelope is" : "envelopes are"} overspent.
          Move money from another envelope or add funds to cover the difference.
        </div>
      )}

      <div>
        <CardHeader
          title="Your Envelopes"
          subtitle={`${envelopes.length} expense categories`}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {envelopes.map((envelope) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
              onFund={() => setFundModal(envelope)}
              onTransfer={() => setTransferModal(envelope)}
              onReturn={() => setReturnModal(envelope)}
            />
          ))}
        </div>
      </div>

      {recentTransfers.length > 0 && (
        <Card>
          <CardHeader title="Recent Movements" subtitle="Transfers between envelopes and pool" />
          <div className="divide-y divide-slate-100">
            {recentTransfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {transfer.from} → {transfer.to}
                  </p>
                  {transfer.note && (
                    <p className="text-xs text-slate-500">{transfer.note}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-indigo-600">
                    {formatCurrency(transfer.amount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatShortDate(transfer.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <EditPoolModal
        isOpen={editPoolOpen}
        onClose={() => setEditPoolOpen(false)}
        currentTotal={pool.totalFunds}
        month={monthDate}
      />

      {fundModal && (
        <FundEnvelopeModal
          isOpen={!!fundModal}
          onClose={() => setFundModal(null)}
          categoryId={fundModal.categoryId}
          categoryName={fundModal.category.name}
          unallocated={pool.unallocated}
          month={monthDate}
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
          month={monthDate}
        />
      )}

      {returnModal && (
        <ReturnToPoolModal
          isOpen={!!returnModal}
          onClose={() => setReturnModal(null)}
          categoryId={returnModal.categoryId}
          categoryName={returnModal.category.name}
          remaining={returnModal.remaining}
          month={monthDate}
        />
      )}
    </div>
  );
}
