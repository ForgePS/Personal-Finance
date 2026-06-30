"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { AddTransactionModal } from "@/components/modals/add-transaction-modal";
import { AccountModal, type AccountRecord } from "@/components/modals/account-modal";

export function AccountDetailActions({
  accountId,
  account,
}: {
  accountId: string;
  account: AccountRecord;
}) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setShowEditModal(true)}>
          <Pencil className="h-4 w-4" />
          Rename
        </Button>
        <Button onClick={() => setShowTransactionModal(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <AccountModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        account={account}
      />
      <AddTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        defaultAccountId={accountId}
      />
    </>
  );
}
