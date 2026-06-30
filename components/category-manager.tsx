"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCentavos } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { ColorPicker } from "@/components/color-picker";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import type { ActionResult } from "@/lib/action-result";
import type { Category } from "@/lib/db/schema";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [createKey, setCreateKey] = useState(0);

  async function submit(
    action: (p: ActionResult, f: FormData) => Promise<ActionResult>,
    fd: FormData,
    onOk?: () => void,
  ) {
    const res = await action({ ok: true }, fd);
    if (res.ok) {
      toast.success("Saved");
      onOk?.();
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Create ─────────────────────────────────────────────────────────── */}
      <form
        key={createKey}
        action={(fd) => submit(createCategoryAction, fd, () => setCreateKey((k) => k + 1))}
        className="surface space-y-4 p-5"
      >
        <span className="eyebrow">New category</span>
        <input name="name" placeholder="Name" className="field w-full px-4 py-3" />
        <div className="flex items-stretch gap-2.5">
          <input
            name="emoji"
            defaultValue="📦"
            aria-label="Emoji"
            className="field w-16 shrink-0 px-2 py-3 text-center text-xl"
          />
          <div className="relative flex-1">
            <span className="money pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
            <MoneyInput
              name="monthlyBudget"
              placeholder="Budget"
              className="field money w-full py-3 pl-8 pr-3.5"
            />
          </div>
        </div>
        <ColorPicker name="color" defaultValue="#0a84ff" />
        <button type="submit" className="btn-accent w-full py-3">Add category</button>
      </form>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {categories.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-3xl">🗂️</span>
          <p className="text-sm text-muted-foreground">No categories yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => {
            const editing = editId === c.id;
            const confirming = confirmId === c.id;
            return (
              <div key={c.id} className="surface p-4">
                {editing ? (
                  <form
                    action={(fd) => submit(updateCategoryAction, fd, () => setEditId(null))}
                    className="space-y-3"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <div className="flex items-stretch gap-2.5">
                      <input name="emoji" defaultValue={c.emoji} aria-label="Emoji" className="field w-16 shrink-0 px-2 py-3 text-center text-xl" />
                      <input name="name" defaultValue={c.name} aria-label="Name" className="field flex-1 px-4 py-3" />
                    </div>
                    <ColorPicker name="color" defaultValue={c.color} />
                    <div className="relative">
                      <span className="money pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                      <MoneyInput
                        name="monthlyBudget"
                        defaultValue={formatCentavos(c.monthlyBudget, { symbol: false })}
                        ariaLabel="Monthly budget"
                        className="field money w-full py-3 pl-8 pr-3.5"
                      />
                    </div>
                    <div className="flex gap-2.5 pt-0.5">
                      <button type="submit" className="btn-accent flex-1 py-2.5 text-sm">Save</button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="flex-1 rounded-[var(--radius)] border border-[var(--border)] py-2.5 text-sm text-muted-foreground transition active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-3.5">
                    <span
                      className="tile h-12 w-12 text-xl"
                      style={{ "--tile": c.color } as CSSProperties}
                    >
                      {c.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold leading-tight">{c.name}</div>
                      <div className="money mt-0.5 text-sm text-muted-foreground">
                        {c.monthlyBudget > 0 ? `${formatCentavos(c.monthlyBudget)} / month` : "No budget"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditId(c.id); setConfirmId(null); }}
                        aria-label={`Edit ${c.name}`}
                        className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-[var(--field)] hover:text-foreground active:scale-90"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                      <form
                        action={async (fd) => {
                          if (confirmId !== c.id) return;
                          try {
                            await deleteCategoryAction(fd);
                            setConfirmId(null);
                          } catch {
                            toast.error("Could not delete category");
                          }
                        }}
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type={confirming ? "submit" : "button"}
                          onClick={() => setConfirmId(confirming ? null : c.id)}
                          aria-label={confirming ? `Confirm delete ${c.name}` : `Delete ${c.name}`}
                          className={
                            confirming
                              ? "rounded-xl bg-danger/15 px-3 py-2.5 text-xs font-semibold text-danger ring-1 ring-inset ring-[color-mix(in_srgb,var(--danger)_40%,transparent)] transition active:scale-95"
                              : "grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-[var(--field)] hover:text-danger active:scale-90"
                          }
                        >
                          {confirming ? (
                            "Confirm delete"
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                              strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
