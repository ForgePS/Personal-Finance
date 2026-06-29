"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddAccountModal } from "@/components/modals/add-account-modal";

export function AccountsHeader() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="text-sm text-slate-500">All your financial accounts in one place</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>
      <AddAccountModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
