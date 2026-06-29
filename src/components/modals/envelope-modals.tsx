"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface EnvelopeOption {
  categoryId: string;
  name: string;
  remaining: number;
}

export function FundEnvelopeModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  unallocated,
  month,
}: {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  unallocated: number;
  month: Date;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/envelopes/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fund",
          categoryId,
          amount: parseFloat(amount),
          month: format(month, "yyyy-MM-dd"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fund envelope");
      router.refresh();
      onClose();
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fund envelope");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Fund ${categoryName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Move money from your unallocated pool into this envelope.
          Available: <span className="font-semibold text-emerald-600">${unallocated.toFixed(2)}</span>
        </p>
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          max={unallocated}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Funding..." : "Fund Envelope"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function TransferEnvelopeModal({
  isOpen,
  onClose,
  fromCategoryId,
  fromCategoryName,
  fromRemaining,
  envelopes,
  month,
}: {
  isOpen: boolean;
  onClose: () => void;
  fromCategoryId: string;
  fromCategoryName: string;
  fromRemaining: number;
  envelopes: EnvelopeOption[];
  month: Date;
}) {
  const router = useRouter();
  const [toCategoryId, setToCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const destinations = envelopes.filter((e) => e.categoryId !== fromCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/envelopes/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          fromCategoryId,
          toCategoryId,
          amount: parseFloat(amount),
          note,
          month: format(month, "yyyy-MM-dd"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      router.refresh();
      onClose();
      setAmount("");
      setNote("");
      setToCategoryId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move from ${fromCategoryName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Available to move: <span className="font-semibold">${fromRemaining.toFixed(2)}</span>
        </p>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">To Envelope</label>
          <select
            value={toCategoryId}
            onChange={(e) => setToCategoryId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select envelope...</option>
            {destinations.map((e) => (
              <option key={e.categoryId} value={e.categoryId}>{e.name}</option>
            ))}
          </select>
        </div>
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          max={fromRemaining}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Need more for groceries"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Moving..." : "Move Money"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ReturnToPoolModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  remaining,
  month,
}: {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  remaining: number;
  month: Date;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/envelopes/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "return",
          categoryId,
          amount: parseFloat(amount),
          month: format(month, "yyyy-MM-dd"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Return failed");
      router.refresh();
      onClose();
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Return from ${categoryName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Return unspent money back to the pool.
          Available: <span className="font-semibold">${remaining.toFixed(2)}</span>
        </p>
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Returning..." : "Return to Pool"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditPoolModal({
  isOpen,
  onClose,
  currentTotal,
  month,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTotal: number;
  month: Date;
}) {
  const router = useRouter();
  const [totalFunds, setTotalFunds] = useState(currentTotal.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/envelopes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalFunds: parseFloat(totalFunds),
          month: format(month, "yyyy-MM-dd"),
        }),
      });
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Monthly Pool">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Set the total amount of money available to allocate across your envelopes this month.
        </p>
        <Input
          label="Total Pool Amount"
          type="number"
          step="0.01"
          min="0"
          value={totalFunds}
          onChange={(e) => setTotalFunds(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Pool"}</Button>
        </div>
      </form>
    </Modal>
  );
}
