"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTransactionModal } from "@/components/modals/add-transaction-modal";

export function AccountDetailActions({ accountId }: { accountId: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        <Plus className="h-4 w-4" />
        Add Transaction
      </Button>
      <AddTransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultAccountId={accountId}
      />
    </>
  );
}
