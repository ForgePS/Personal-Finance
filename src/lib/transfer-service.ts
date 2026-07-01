import { db } from "@/lib/db";
import { getTenantId } from "@/lib/tenant-context";
import { updateAccountBalanceFromTransaction } from "@/lib/services";

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  description: string;
  merchant?: string | null;
  notes?: string | null;
}

function validateTransferAccounts(fromAccountId: string, toAccountId: string) {
  if (!fromAccountId || !toAccountId) {
    throw new Error("Both accounts are required for a transfer");
  }
  if (fromAccountId === toAccountId) {
    throw new Error("Cannot transfer to the same account");
  }
}

async function applyTransferBalances(fromAccountId: string, toAccountId: string, amount: number) {
  const fromAmount = -Math.abs(amount);
  await updateAccountBalanceFromTransaction(fromAccountId, fromAmount);
  await updateAccountBalanceFromTransaction(toAccountId, Math.abs(amount));
}

async function reverseTransferBalances(fromAccountId: string, toAccountId: string, amount: number) {
  await updateAccountBalanceFromTransaction(fromAccountId, -amount);
  await updateAccountBalanceFromTransaction(toAccountId, amount);
}

export async function createTransfer(input: TransferInput) {
  validateTransferAccounts(input.fromAccountId, input.toAccountId);
  const amount = Math.abs(input.amount);
  if (!amount) throw new Error("Transfer amount must be greater than zero");

  const transaction = await db.transaction.create({
    data: {
      tenantId: getTenantId(),
      accountId: input.fromAccountId,
      transferAccountId: input.toAccountId,
      categoryId: null,
      date: input.date,
      amount: -amount,
      description: input.description,
      merchant: input.merchant || null,
      notes: input.notes || null,
      isTransfer: true,
    },
    include: { category: true, account: true, transferAccount: true },
  });

  await applyTransferBalances(input.fromAccountId, input.toAccountId, amount);
  return transaction;
}

export async function updateTransfer(
  existing: {
    id: string;
    accountId: string;
    transferAccountId: string | null;
    amount: number;
    isTransfer: boolean;
  },
  input: Partial<TransferInput> & {
    description?: string;
    merchant?: string | null;
    notes?: string | null;
    date?: Date;
  }
) {
  if (!existing.isTransfer || !existing.transferAccountId) {
    throw new Error("Transaction is not a linked transfer");
  }

  const fromAccountId = input.fromAccountId ?? existing.accountId;
  const toAccountId = input.toAccountId ?? existing.transferAccountId;
  validateTransferAccounts(fromAccountId, toAccountId);

  const amount = Math.abs(input.amount ?? existing.amount);
  if (!amount) throw new Error("Transfer amount must be greater than zero");

  await reverseTransferBalances(existing.accountId, existing.transferAccountId, existing.amount);

  const transaction = await db.transaction.update({
    where: { id: existing.id },
    data: {
      accountId: fromAccountId,
      transferAccountId: toAccountId,
      categoryId: null,
      ...(input.date !== undefined && { date: input.date }),
      amount: -amount,
      ...(input.description !== undefined && { description: input.description }),
      ...(input.merchant !== undefined && { merchant: input.merchant }),
      ...(input.notes !== undefined && { notes: input.notes }),
      isTransfer: true,
    },
    include: { category: true, account: true, transferAccount: true },
  });

  await applyTransferBalances(fromAccountId, toAccountId, amount);
  return transaction;
}

export async function deleteTransfer(existing: {
  accountId: string;
  transferAccountId: string | null;
  amount: number;
  isTransfer: boolean;
}) {
  if (existing.isTransfer && existing.transferAccountId) {
    await reverseTransferBalances(existing.accountId, existing.transferAccountId, existing.amount);
  }
}
