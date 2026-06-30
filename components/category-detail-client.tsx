"use client";

import { useState } from "react";
import { Fab } from "@/components/fab";
import { ExpenseSheet } from "@/components/expense-sheet";
import { TransactionRow } from "@/components/transaction-row";
import type { Category } from "@/lib/db/schema";
import type { TransactionWithItems } from "@/lib/data/transactions";

export function CategoryDetailClient({
  category, transactions, defaultDate,
}: { category: Category; transactions: TransactionWithItems[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [editTx, setEditTx] = useState<TransactionWithItems | undefined>(undefined);

  function openAdd() { setEditTx(undefined); setOpen(true); }
  function openEdit(tx: TransactionWithItems) { setEditTx(tx); setOpen(true); }

  return (
    <>
      <section className="space-y-2">
        {transactions.length === 0 && (
          <div className="surface reveal flex flex-col items-center gap-2 px-6 py-12 text-center" style={{ animationDelay: "150ms" }}>
            <span className="text-3xl">🧾</span>
            <p className="text-sm text-muted-foreground">No expenses this month.</p>
          </div>
        )}
        {transactions.map((tx, i) => (
          <div key={tx.id} className="reveal" style={{ animationDelay: `${150 + i * 45}ms` }}>
            <TransactionRow tx={tx} onEdit={() => openEdit(tx)} />
          </div>
        ))}
      </section>

      <Fab onClick={openAdd} />
      <ExpenseSheet
        // remount per open so mode/item-row state resets cleanly between trips
        key={`${open}-${editTx?.id ?? "new"}`}
        open={open}
        onClose={() => setOpen(false)}
        categories={[category]}
        defaultDate={defaultDate}
        presetCategoryId={category.id}
        editTx={editTx}
        editItems={editTx?.items}
      />
    </>
  );
}
