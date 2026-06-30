"use client";

import { useState } from "react";
import { formatCentavos } from "@/lib/money";
import { paymentLabel } from "@/lib/payment";
import { deleteExpenseAction } from "@/app/actions/expenses";
import type { TransactionWithItems } from "@/lib/data/transactions";

export function TransactionRow({ tx, onEdit }: { tx: TransactionWithItems; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = tx.items.length > 0;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left transition active:scale-[0.99]">
          <div className="truncate font-semibold leading-tight">{tx.description || "—"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{tx.occurredOn} · {paymentLabel(tx.paymentMethod)}</div>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="money font-semibold">{formatCentavos(tx.amount)}</span>
          <form action={deleteExpenseAction}>
            <input type="hidden" name="id" value={tx.id} />
            <input type="hidden" name="categoryId" value={tx.categoryId} />
            <button
              type="submit"
              aria-label="Delete"
              className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-[var(--field)] hover:text-danger active:scale-90"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {hasItems && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--field)] px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-[var(--border)] transition hover:text-foreground active:scale-95"
          >
            {tx.items.length} {tx.items.length === 1 ? "item" : "items"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {expanded && (
            <ul className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
              {tx.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">{it.name}</span>
                  <span className="money shrink-0 tabular-nums">{formatCentavos(it.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
