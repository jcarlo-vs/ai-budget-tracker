import type { CSSProperties } from "react";
import Link from "next/link";
import type { LocalCategory } from "@/lib/local/types";
import { formatCentavos } from "@/lib/money";
import { MarkPaidButton } from "@/components/mark-paid-button";

/**
 * Home category card: a tinted emoji tile (carrying the category colour), the
 * name + budget subtitle, the spent amount on the right with the remaining/over
 * line beneath it, and a slim category-coloured progress bar with a "% used"
 * label underneath. No left colour stripe — the colour lives in the tile + bar.
 *
 * Uses the stretched-link pattern: a single absolutely-positioned <Link> covers
 * the whole card for navigation, while the non-interactive content is
 * `pointer-events-none` so taps fall through to it. This lets a separate "Paid"
 * <form> (which can't be nested inside an <a>) sit alongside the link when the
 * category still has budget remaining.
 *
 * The spent amount is shown exactly once (top-right) so tests that query for
 * the formatted spent value resolve to a single element. The detail link
 * exposes its `/category?id=…` href for the existing card test (the detail page
 * is a static `?id=` route so the service worker can precache it for offline).
 */
export function CategoryCard({
  category, spent, ym,
}: {
  category: LocalCategory;
  spent: number;
  ym?: { year: number; month: number };
}) {
  const budget = category.monthlyBudget;
  const hasBudget = budget > 0;
  const remaining = budget - spent;
  const over = hasBudget && spent > budget;
  const pct = hasBudget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const fill = over ? "var(--danger)" : category.color;
  const showPaid = hasBudget && remaining > 0 && ym != null;

  return (
    <div className="surface group relative block overflow-hidden p-4 transition-transform duration-150 active:scale-[0.985]">
      <Link
        href={`/category?id=${category.id}`}
        aria-label={category.name}
        className="absolute inset-0 z-[1] rounded-[inherit]"
      />

      <div className="pointer-events-none relative z-[2] flex items-center gap-3.5">
        <span
          className="tile h-12 w-12 text-xl"
          style={{ "--tile": category.color } as CSSProperties}
        >
          {category.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold leading-tight">{category.name}</span>
            {category.scopeYear != null && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                  border: "0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                }}
              >
                This month
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {hasBudget ? <>of {formatCentavos(budget)}</> : "No budget set"}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="money font-semibold leading-tight">{formatCentavos(spent)}</div>
          {hasBudget && (
            <div className="mt-0.5 text-xs">
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
        <div className="pointer-events-none relative z-[2] mt-3.5 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--field)] ring-1 ring-inset ring-[var(--border)]">
            <div
              className="bar-fill h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, color-mix(in srgb, ${fill} 55%, transparent), ${fill})`,
                boxShadow: `0 0 8px -1px color-mix(in srgb, ${fill} 80%, transparent)`,
              }}
            />
          </div>
          <span
            className={`money shrink-0 text-[0.6875rem] font-semibold tabular-nums ${over ? "text-danger" : "text-muted-foreground"}`}
          >
            {pct}%
          </span>
          {showPaid ? (
            <MarkPaidButton
              categoryId={category.id}
              categoryName={category.name}
              remaining={remaining}
              year={ym.year}
              month={ym.month}
              className="pointer-events-auto shrink-0"
            />
          ) : hasBudget && remaining <= 0 ? (
            <span
              aria-label="Fully paid"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
              style={{
                color: "var(--accent-2)",
                background: "color-mix(in srgb, var(--accent-2) 18%, transparent)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
