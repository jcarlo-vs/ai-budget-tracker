export interface YearMonth {
  year: number;
  month: number; // 1-12
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getYearMonth(date: Date): YearMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthRange(ym: YearMonth): { start: string; end: string } {
  const next = shiftMonth(ym, 1);
  return {
    start: `${ym.year}-${pad(ym.month)}-01`,
    end: `${next.year}-${pad(next.month)}-01`,
  };
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const zeroBased = ym.month - 1 + delta;
  const year = ym.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return { year, month };
}

export function formatMonthLabel(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}

export function monthKey(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}

/**
 * Parse `?y=`/`?m=` query params into a YearMonth, clamping anything invalid or
 * out of range to `fallback` (normally the current month). Without this guard a
 * value like `?y=abc` or `?m=13` builds a date string such as "NaN-06-01" /
 * "2026-13-01" that crashes Postgres with a 500.
 */
export function parseYearMonth(
  rawY: string | undefined,
  rawM: string | undefined,
  fallback: YearMonth,
): YearMonth {
  const y = Number(rawY);
  const m = Number(rawM);
  return {
    year: Number.isInteger(y) && y >= 1970 && y <= 9999 ? y : fallback.year,
    month: Number.isInteger(m) && m >= 1 && m <= 12 ? m : fallback.month,
  };
}
