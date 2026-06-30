"use client";

import { formatCentavos } from "@/lib/money";
import { paymentLabel } from "@/lib/payment";
import { deleteExpenseAction } from "@/app/actions/expenses";
import type { Transaction } from "@/lib/db/schema";

export function TransactionRow({ tx, onEdit }: { tx: Transaction; onEdit: () => void }) {
  return (
    <div className="surface flex items-center justify-between p-3.5">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left transition active:scale-[0.99]">
        <div className="truncate font-medium">{tx.description || "—"}</div>
        <div className="text-xs text-muted-foreground">{tx.occurredOn} · {paymentLabel(tx.paymentMethod)}</div>
      </button>
      <div className="flex items-center gap-2">
        <span className="money font-semibold">{formatCentavos(tx.amount)}</span>
        <form action={deleteExpenseAction}>
          <input type="hidden" name="id" value={tx.id} />
          <input type="hidden" name="categoryId" value={tx.categoryId} />
          <button
            type="submit"
            aria-label="Delete"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:text-danger active:scale-90"
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
  );
}
