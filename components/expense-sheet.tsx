"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/sheet";
import { addExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { formatCentavos, parseAmountToCentavos } from "@/lib/money";
import { MoneyInput, groupThousands } from "@/components/money-input";
import { PAYMENT_METHODS } from "@/lib/payment";
import type { Category, Transaction, ExpenseItem } from "@/lib/db/schema";

type ItemRow = { id: number; name: string; amount: string };

export function ExpenseSheet({
  open, onClose, categories, defaultDate, presetCategoryId, editTx, editItems,
}: {
  open: boolean; onClose: () => void; categories: Category[];
  defaultDate: string; presetCategoryId?: number; editTx?: Transaction; editItems?: ExpenseItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(editTx);
  const [method, setMethod] = useState<string>(editTx?.paymentMethod ?? "cash");

  const idRef = useRef(0);
  const makeRow = (name = "", amount = ""): ItemRow => ({ id: idRef.current++, name, amount });

  const hasEditItems = Boolean(editItems && editItems.length > 0);
  const [itemized, setItemized] = useState(hasEditItems);
  const [rows, setRows] = useState<ItemRow[]>(() =>
    hasEditItems
      ? editItems!.map((it) => makeRow(it.name, groupThousands(formatCentavos(it.amount, { symbol: false }))))
      : [makeRow()],
  );

  const updateRow = (id: number, patch: Partial<ItemRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => setRows((rs) => [...rs, makeRow()]);

  const totalCentavos = rows.reduce((acc, r) => acc + (parseAmountToCentavos(r.amount) ?? 0), 0);
  const itemsJson = itemized
    ? JSON.stringify(
        rows
          .map((r) => ({ name: r.name.trim(), amount: parseAmountToCentavos(r.amount) ?? 0 }))
          .filter((r) => r.name && r.amount > 0),
      )
    : "[]";

  const submitLabel = editing
    ? "Save changes"
    : itemized && totalCentavos > 0
      ? `Add expense ${formatCentavos(totalCentavos)}`
      : "Add expense";

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
        <input type="hidden" name="items" value={itemsJson} />

        {/* Quick vs Itemize mode */}
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Expense mode">
          {[
            { key: false, label: "Quick" },
            { key: true, label: "Itemize" },
          ].map((m) => (
            <button
              key={String(m.key)}
              type="button"
              onClick={() => setItemized(m.key)}
              aria-pressed={itemized === m.key}
              className={`rounded-[var(--radius)] py-2 text-sm font-medium transition active:scale-95 ${
                itemized === m.key ? "bg-accent text-accent-foreground" : "field text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {itemized ? (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2">
                <input
                  value={r.name}
                  onChange={(e) => updateRow(r.id, { name: e.target.value })}
                  autoFocus={i === 0}
                  placeholder="Item"
                  aria-label="Item name"
                  className="field min-w-0 flex-1 px-3 py-2.5"
                />
                <div className="relative w-28 shrink-0">
                  <span className="money pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                  <MoneyInput
                    value={r.amount}
                    onValueChange={(v) => updateRow(r.id, { amount: v })}
                    ariaLabel="Item price"
                    placeholder="0.00"
                    className="field money w-full py-2.5 pl-6 pr-2 text-right tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label="Remove item"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:text-danger active:scale-90"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" className="h-4 w-4" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="field flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add item
            </button>

            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="money display text-lg font-semibold tracking-tight">{formatCentavos(totalCentavos)}</span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <span className="money pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">₱</span>
            <MoneyInput
              name="amount" autoFocus placeholder="0.00"
              defaultValue={editTx ? formatCentavos(editTx.amount, { symbol: false }) : ""}
              className="field money display w-full py-3.5 pl-10 pr-4 text-2xl font-semibold tracking-tight"
            />
          </div>
        )}

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
          {pending ? "Saving…" : submitLabel}
        </button>
      </form>
    </Sheet>
  );
}
