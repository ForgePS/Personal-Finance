"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTransactionModal } from "@/components/modals/add-transaction-modal";
import { AddAccountModal } from "@/components/modals/add-account-modal";

export function DashboardActions({ defaultAccountId }: { defaultAccountId?: string }) {
  const [showTransaction, setShowTransaction] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
        <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => setShowAccount(true)}>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
        <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowTransaction(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>
      <AddTransactionModal
        isOpen={showTransaction}
        onClose={() => setShowTransaction(false)}
        defaultAccountId={defaultAccountId}
      />
      <AddAccountModal isOpen={showAccount} onClose={() => setShowAccount(false)} />
    </>
  );
}
