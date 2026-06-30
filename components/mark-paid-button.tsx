"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCentavos } from "@/lib/money";
import type { ActionResult } from "@/lib/action-result";

export type MarkPaidAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

// A small greyed check button. Tapping it opens an in-app confirmation modal
// (portaled to <body> so the card's overflow/blur never clips it) before logging
// the "Paid" expense. Receives the server action as a prop so the server-only
// action module is never imported into jsdom-tested components.
export function MarkPaidButton({
  action, categoryId, categoryName, remaining, year, month, className,
}: {
  action: MarkPaidAction;
  categoryId: number;
  categoryName: string;
  remaining: number;
  year: number;
  month: number;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("categoryId", String(categoryId));
      fd.set("year", String(year));
      fd.set("month", String(month));
      const res = await action({ ok: true }, fd);
      if (res.ok) {
        toast.success("Marked paid");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Mark ${categoryName} as paid`}
        className={`grid h-8 w-8 place-items-center rounded-full text-muted-foreground ring-1 ring-inset ring-[var(--border)] transition hover:text-accent active:scale-90 ${className ?? ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-6 backdrop-blur-sm"
            onClick={() => {
              if (!pending) setOpen(false);
            }}
          >
            <div className="glass-modal reveal w-full max-w-xs p-5 text-center" onClick={(e) => e.stopPropagation()}>
              <div
                className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full text-accent"
                style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-base font-semibold">Mark {categoryName} as paid?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Logs <span className="money font-semibold text-foreground">{formatCentavos(remaining)}</span> today,
                filling this category to its budget.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="field py-2.5 text-sm font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={pending}
                  className="btn-accent py-2.5 text-sm disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Mark paid"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
