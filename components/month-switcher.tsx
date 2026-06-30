import Link from "next/link";
import { formatMonthLabel, shiftMonth, type YearMonth } from "@/lib/month";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d={dir === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

export function MonthSwitcher({
  ym,
  basePath,
  params,
}: {
  ym: YearMonth;
  basePath: string;
  /** Extra query params to preserve on the URL (e.g. `{ id }` for the category page). */
  params?: Record<string, string | number>;
}) {
  const prev = shiftMonth(ym, -1);
  const next = shiftMonth(ym, 1);
  // Compose the query string with URLSearchParams so it stays correct even when
  // basePath already carries params (e.g. the category page passes `{ id }`):
  // `/category` + `{ id }` -> `/category?id=…&y=…&m=…` (never a broken `?id=…?y=…`).
  const href = (m: YearMonth) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) search.set(key, String(value));
    }
    search.set("y", String(m.year));
    search.set("m", String(m.month));
    return `${basePath}?${search.toString()}`;
  };
  return (
    <div className="flex items-center justify-between">
      <Link
        href={href(prev)}
        aria-label="Previous month"
        className="surface grid h-10 w-10 place-items-center text-muted-foreground transition-transform active:scale-90"
      >
        <Chevron dir="left" />
      </Link>
      <span className="display text-lg font-semibold tracking-tight">{formatMonthLabel(ym)}</span>
      <Link
        href={href(next)}
        aria-label="Next month"
        className="surface grid h-10 w-10 place-items-center text-muted-foreground transition-transform active:scale-90"
      >
        <Chevron dir="right" />
      </Link>
    </div>
  );
}
