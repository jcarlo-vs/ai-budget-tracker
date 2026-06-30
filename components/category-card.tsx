import Link from "next/link";
import type { Category } from "@/lib/db/schema";
import { formatCentavos } from "@/lib/money";

/**
 * Cleo-style category row: emoji in a soft neutral circle, name + a muted
 * budget subtitle, the spent amount on the right with the remaining/over line
 * beneath it, and a thin full-width progress bar underneath. No left color
 * stripe. The whole row is a tappable link to the category detail page.
 *
 * The spent amount is shown exactly once (top-right) so tests that query for
 * the formatted spent value resolve to a single element.
 */
export function CategoryCard({ category, spent }: { category: Category; spent: number }) {
  const budget = category.monthlyBudget;
  const hasBudget = budget > 0;
  const remaining = budget - spent;
  const over = hasBudget && spent > budget;
  const pct = hasBudget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const fill = over ? "var(--danger)" : "var(--accent)";

  return (
    <Link
      href={`/category/${category.id}`}
      className="surface group block p-4 transition-transform duration-150 active:scale-[0.985]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--field)] text-xl ring-1 ring-inset ring-[var(--border)]">
          {category.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{category.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {hasBudget ? <>of {formatCentavos(budget)} budget</> : "No budget set"}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="money font-semibold">{formatCentavos(spent)}</div>
          {hasBudget && (
            <div className="text-xs">
              {remaining >= 0 ? (
                <span className="text-muted-foreground">
                  <span className="money text-accent">{formatCentavos(remaining)}</span> left
                </span>
              ) : (
                <span className="money text-danger">{formatCentavos(-remaining)} over</span>
              )}
            </div>
          )}
        </div>
      </div>

      {hasBudget && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--field)] ring-1 ring-inset ring-[var(--border)]">
          <div
            className="bar-fill h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, color-mix(in srgb, ${fill} 70%, transparent), ${fill})`,
              boxShadow: `0 0 10px -2px ${fill}`,
            }}
          />
        </div>
      )}
    </Link>
  );
}
