"use client";

import { useState } from "react";
import { Fab } from "@/components/fab";
import { ExpenseSheet } from "@/components/expense-sheet";
import type { Category } from "@/lib/db/schema";

export function DashboardClient({ categories, defaultDate }: { categories: Category[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab onClick={() => setOpen(true)} />
      <ExpenseSheet key={open ? "open" : "closed"} open={open} onClose={() => setOpen(false)} categories={categories} defaultDate={defaultDate} />
    </>
  );
}
