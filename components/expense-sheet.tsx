"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/sheet";
import { addExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { formatCentavos } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { PAYMENT_METHODS } from "@/lib/payment";
import type { Category, Transaction } from "@/lib/db/schema";

export function ExpenseSheet({
  open, onClose, categories, defaultDate, presetCategoryId, editTx,
}: {
  open: boolean; onClose: () => void; categories: Category[];
  defaultDate: string; presetCategoryId?: number; editTx?: Transaction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(editTx);
  const [method, setMethod] = useState<string>(editTx?.paymentMethod ?? "cash");

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit expense" : "Add expense"}>
      <form
        action={(fd) =>
          startTransition(async () => {
            const res = editing
              ? await updateExpenseAction({ ok: true }, fd)
              : await addExpenseAction({ ok: true }, fd);
            if (res.ok) {
              toast.success(editing ? "Expense updated" : "Expense added");
              router.refresh();
              onClose();
            } else {
              toast.error(res.error);
            }
          })
        }
        className="space-y-3"
      >
        {editTx && <input type="hidden" name="id" value={editTx.id} />}
        <div className="relative">
          <span className="money pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">₱</span>
          <MoneyInput
            name="amount" autoFocus placeholder="0.00"
            defaultValue={editTx ? formatCentavos(editTx.amount, { symbol: false }) : ""}
            className="field money display w-full py-3.5 pl-10 pr-4 text-2xl font-semibold tracking-tight"
          />
        </div>
        <input
          name="description" placeholder="Description (optional)"
          defaultValue={editTx?.description ?? ""}
          className="field w-full px-4 py-3"
        />
        <select
          name="categoryId"
          defaultValue={editTx?.categoryId ?? presetCategoryId ?? categories[0]?.id}
          className="field w-full px-4 py-3"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
        <input type="hidden" name="paymentMethod" value={method} />
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              aria-pressed={method === m.value}
              className={`rounded-[var(--radius)] py-2.5 text-sm font-medium transition active:scale-95 ${
                method === m.value ? "bg-accent text-accent-foreground" : "field text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input
          name="occurredOn" type="date"
          defaultValue={editTx?.occurredOn ?? defaultDate}
          className="field w-full px-4 py-3"
        />
        <button type="submit" disabled={pending} className="btn-accent w-full px-4 py-3.5">
          {pending ? "Saving…" : editing ? "Save changes" : "Add expense"}
        </button>
      </form>
    </Sheet>
  );
}
