"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setMonthlyBudget, deleteMonthlyBudget } from "@/lib/local/data/budgets";
import { formatCentavos, parseAmountToCentavos } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";

export function BudgetForm({
  year, month, label, currentAmount, suggested,
}: {
  year: number; month: number; label: string;
  currentAmount: number | null; suggested: number | null;
}) {
  const [pending, startSave] = useTransition();
  const [clearing, startClear] = useTransition();
  const prefill =
    currentAmount != null
      ? formatCentavos(currentAmount, { symbol: false })
      : suggested != null
        ? formatCentavos(suggested, { symbol: false })
        : "";

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = parseAmountToCentavos(String(new FormData(e.currentTarget).get("amount") ?? ""));
    if (amount == null || amount < 0) {
      toast.error("Enter a valid budget amount");
      return;
    }
    startSave(async () => {
      try {
        await setMonthlyBudget({ year, month }, amount);
        toast.success(`Budget saved for ${label}`);
      } catch {
        toast.error("Could not save budget");
      }
    });
  }

  function onClear() {
    startClear(async () => {
      try {
        await deleteMonthlyBudget({ year, month });
        toast.success(`Budget cleared for ${label}`);
      } catch {
        toast.error("Could not clear budget");
      }
    });
  }

  return (
    <div className="surface space-y-3 p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Monthly budget</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      <form onSubmit={onSave} className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="money pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
            ₱
          </span>
          <MoneyInput
            name="amount"
            defaultValue={prefill}
            placeholder="0.00"
            ariaLabel={`Budget for ${label}`}
            className="field money display w-full py-3 pl-9 pr-4 text-2xl font-semibold tracking-tight"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-accent shrink-0 px-5 text-sm">
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="flex items-center justify-between">
        {currentAmount == null && suggested != null ? (
          <p className="text-xs text-muted-foreground">Prefilled from a previous month — Save to apply to {label}.</p>
        ) : (
          <span />
        )}
        {currentAmount != null && (
          <button
            type="button"
            onClick={onClear}
            disabled={clearing}
            className="text-xs text-muted-foreground underline-offset-2 transition hover:text-danger hover:underline disabled:opacity-60"
          >
            {clearing ? "Clearing…" : "Clear budget"}
          </button>
        )}
      </div>
    </div>
  );
}
