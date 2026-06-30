"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { AccountCard } from "@/components/account-card";
import { AccountModal, type AccountRecord } from "@/components/modals/account-modal";

export function EditableAccountsGrid({
  accounts,
}: {
  accounts: AccountRecord[];
}) {
  const [editing, setEditing] = useState<AccountRecord | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="group relative">
            <AccountCard
              id={account.id}
              name={account.name}
              type={account.type}
              institution={account.institution}
              balance={account.balance}
              color={account.color}
              icon={account.icon}
              isLinked={account.isLinked}
              mask={account.mask}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditing(account);
              }}
              className="absolute right-3 top-3 rounded-lg bg-white/90 p-2 text-slate-500 opacity-100 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600 sm:opacity-0 sm:group-hover:opacity-100"
              title="Rename account"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <AccountModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        account={editing}
      />
    </>
  );
}
