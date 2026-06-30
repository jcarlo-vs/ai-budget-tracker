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

export function MonthSwitcher({ ym, basePath }: { ym: YearMonth; basePath: string }) {
  const prev = shiftMonth(ym, -1);
  const next = shiftMonth(ym, 1);
  const href = (m: YearMonth) => `${basePath}?y=${m.year}&m=${m.month}`;
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
