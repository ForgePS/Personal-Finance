"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddGoalModal } from "@/components/modals/add-goal-modal";

export function GoalsHeader() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
          <p className="text-sm text-slate-500">Save toward what matters most</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Create Goal
        </Button>
      </div>
      <AddGoalModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
