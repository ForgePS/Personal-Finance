"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { formatCurrency } from "@/lib/utils";
import { formatFrequencyLabel } from "@/lib/schedule-service";
import { cn } from "@/lib/utils";
import {
  CategoryModal,
  type CategoryRecord,
} from "@/components/modals/category-modal";
import { AccountModal, type AccountRecord } from "@/components/modals/account-modal";
import { GoalModal, type GoalRecord } from "@/components/modals/goal-modal";
import {
  ScheduleModal,
  type ScheduleRecord,
} from "@/components/modals/schedule-modal";
import {
  Settings,
  Tags,
  Receipt,
  Briefcase,
  Landmark,
  Target,
  Plus,
  Pencil,
  KeyRound,
} from "lucide-react";
import { BankLinkingSettings } from "@/components/bank-linking-settings";
import { isLiability } from "@/lib/constants";

const TABS = [
  { id: "categories", label: "Categories", icon: Tags },
  { id: "known-expenses", label: "Known Expenses", icon: Receipt },
  { id: "pay-schedules", label: "Pay Schedules", icon: Briefcase },
  { id: "accounts", label: "Accounts", icon: Landmark },
  { id: "goals", label: "Goals", icon: Target },
  { id: "bank-linking", label: "Bank Linking", icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SettingsPageClientProps {
  categories: CategoryRecord[];
  accounts: AccountRecord[];
  goals: GoalRecord[];
  paySchedules: ScheduleRecord[];
  knownExpenses: ScheduleRecord[];
  initialTab: TabId;
}

export function SettingsPageClient({
  categories,
  accounts,
  goals,
  paySchedules,
  knownExpenses,
  initialTab,
}: SettingsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || initialTab;

  const [categoryModal, setCategoryModal] = useState<
    CategoryRecord | "new-income" | "new-expense" | null
  >(null);
  const [accountModal, setAccountModal] = useState<AccountRecord | null | "new">(null);
  const [goalModal, setGoalModal] = useState<GoalRecord | null | "new">(null);
  const [expenseModal, setExpenseModal] = useState<ScheduleRecord | null | "new">(null);
  const [payModal, setPayModal] = useState<ScheduleRecord | null | "new">(null);

  const setTab = (id: TabId) => {
    router.push(`/settings?tab=${id}`);
  };

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
          <Settings className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">
            Manage categories, known expenses, accounts, and goals
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "categories" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader title="Income Categories" subtitle="Salary, freelance, and other income" />
              <Button size="sm" onClick={() => setCategoryModal("new-income")}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <CategoryList
              items={incomeCategories}
              onEdit={(c) => setCategoryModal(c)}
            />
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardHeader title="Expense Categories" subtitle="Used in transactions, budgets, and envelopes" />
              <Button size="sm" onClick={() => setCategoryModal("new-expense")}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <CategoryList
              items={expenseCategories}
              onEdit={(c) => setCategoryModal(c)}
            />
          </Card>
        </div>
      )}

      {tab === "known-expenses" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardHeader
              title="Known Expenses"
              subtitle="Recurring bills and expenses you plan for (rent, subscriptions, etc.)"
            />
            <Button size="sm" onClick={() => setExpenseModal("new")}>
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
          {knownExpenses.length === 0 ? (
            <p className="text-sm text-slate-500">
              No known expenses yet. Add recurring bills to see them on the Planning calendar.
            </p>
          ) : (
            <ScheduleList
              items={knownExpenses}
              type="expense"
              onEdit={(s) => setExpenseModal(s)}
            />
          )}
        </Card>
      )}

      {tab === "pay-schedules" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardHeader
              title="Pay Schedules"
              subtitle="Expected income on a recurring schedule"
            />
            <Button size="sm" onClick={() => setPayModal("new")}>
              <Plus className="h-4 w-4" />
              Add Pay Schedule
            </Button>
          </div>
          {paySchedules.length === 0 ? (
            <p className="text-sm text-slate-500">No pay schedules yet.</p>
          ) : (
            <ScheduleList
              items={paySchedules}
              type="income"
              onEdit={(s) => setPayModal(s)}
            />
          )}
        </Card>
      )}

      {tab === "accounts" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardHeader title="Accounts" subtitle="Manual and linked bank accounts" />
            <Button size="sm" onClick={() => setAccountModal("new")}>
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setAccountModal(account)}
                className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${account.color}20` }}
                  >
                    <DynamicIcon
                      name={account.icon}
                      className="h-5 w-5"
                      style={{ color: account.color }}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {account.name}
                      {account.isArchived && (
                        <span className="ml-2 text-xs text-slate-400">(archived)</span>
                      )}
                      {account.isLinked && (
                        <span className="ml-2 text-xs text-indigo-500">(linked)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {account.institution || account.type.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      isLiability(account.type) ? "text-rose-600" : "text-slate-900"
                    )}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {tab === "bank-linking" && <BankLinkingSettings />}

      {tab === "goals" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardHeader title="Savings Goals" subtitle="Targets and progress tracking" />
            <Button size="sm" onClick={() => setGoalModal("new")}>
              <Plus className="h-4 w-4" />
              Add Goal
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {goals.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No goals yet.</p>
            ) : (
              goals.map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
                    : 0;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setGoalModal(goal)}
                    className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        <DynamicIcon
                          name={goal.icon}
                          className="h-5 w-5"
                          style={{ color: goal.color }}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{goal.name}</p>
                        <p className="text-xs text-slate-500">{pct}% complete</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      )}

      <CategoryModal
        isOpen={categoryModal !== null}
        onClose={() => setCategoryModal(null)}
        category={
          categoryModal === "new-income" || categoryModal === "new-expense"
            ? null
            : categoryModal
        }
        defaultType={
          categoryModal === "new-income"
            ? "INCOME"
            : categoryModal === "new-expense"
              ? "EXPENSE"
              : undefined
        }
      />
      <AccountModal
        isOpen={accountModal !== null}
        onClose={() => setAccountModal(null)}
        account={accountModal === "new" ? null : accountModal}
      />
      <GoalModal
        isOpen={goalModal !== null}
        onClose={() => setGoalModal(null)}
        goal={goalModal === "new" ? null : goalModal}
      />
      <ScheduleModal
        isOpen={expenseModal !== null}
        onClose={() => setExpenseModal(null)}
        type="expense"
        schedule={expenseModal === "new" ? null : expenseModal}
      />
      <ScheduleModal
        isOpen={payModal !== null}
        onClose={() => setPayModal(null)}
        type="income"
        schedule={payModal === "new" ? null : payModal}
      />
    </div>
  );
}

function CategoryList({
  items,
  onEdit,
}: {
  items: CategoryRecord[];
  onEdit: (c: CategoryRecord) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No categories yet.</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {items.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onEdit(cat)}
          className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${cat.color}20` }}
            >
              <DynamicIcon name={cat.icon} className="h-4 w-4" style={{ color: cat.color }} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{cat.name}</p>
              <p className="text-xs text-slate-500">
                {cat.budgetable ? "Budgetable" : "Not budgetable"}
              </p>
            </div>
          </div>
          <Pencil className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ))}
    </div>
  );
}

function ScheduleList({
  items,
  type,
  onEdit,
}: {
  items: ScheduleRecord[];
  type: "income" | "expense";
  onEdit: (s: ScheduleRecord) => void;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onEdit(item)}
          className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div>
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">
                {formatFrequencyLabel(item)}
                {!item.isActive && " · Paused"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-semibold tabular-nums",
                type === "income" ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatCurrency(item.amount)}
            </span>
            <Pencil className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </button>
      ))}
    </div>
  );
}
