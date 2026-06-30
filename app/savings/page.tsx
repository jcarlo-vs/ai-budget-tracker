import { db } from "@/lib/db/client";
import { getSavings } from "@/lib/data/savings";
import { getMonthlyBudget } from "@/lib/data/budgets";
import { getCategoriesWithMonthTotals } from "@/lib/data/overview";
import { getYearMonth, formatMonthLabel } from "@/lib/month";
import { formatCentavos } from "@/lib/money";

// Per-request render: reads the DB and "today"; never prerender/cache at build.
export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const now = getYearMonth(new Date());
  const [{ total, months }, currentBudget, rows] = await Promise.all([
    getSavings(db, now),
    getMonthlyBudget(db, now),
    getCategoriesWithMonthTotals(db, now),
  ]);
  const currentSpent = rows.reduce((acc, r) => acc + r.spent, 0);
  const projected = currentBudget != null ? currentBudget - currentSpent : null;

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-28 pt-6">
      <h1 className="display reveal text-2xl font-bold tracking-tight">Savings</h1>

      <section className="surface reveal relative overflow-hidden p-6 text-center" style={{ animationDelay: "60ms" }}>
        <div
          aria-hidden
          className="glow-pulse pointer-events-none absolute left-1/2 top-0 h-40 w-56 -translate-x-1/2 -translate-y-1/3 rounded-full"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 70%)" }}
        />
        <span className="eyebrow">Total saved</span>
        <div
          className={`money display mt-2 text-5xl font-bold leading-none tracking-tight ${
            total >= 0 ? "text-accent" : "text-danger"
          }`}
        >
          {total < 0 ? "−" : ""}{formatCentavos(Math.abs(total))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Each finished month banks its leftover here.
        </p>
      </section>

      {projected != null && (
        <section className="surface reveal p-5" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <span className="eyebrow">This month</span>
            <span className="text-sm text-muted-foreground">{formatMonthLabel(now)}</span>
          </div>
          <div className={`money mt-1 text-2xl font-semibold tracking-tight ${projected >= 0 ? "" : "text-danger"}`}>
            {projected < 0 ? "−" : ""}{formatCentavos(Math.abs(projected))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Projected — banks when the month ends.</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="eyebrow reveal px-1" style={{ animationDelay: "160ms" }}>History</h2>
        {months.length === 0 ? (
          <div className="surface reveal flex flex-col items-center gap-2 px-6 py-12 text-center" style={{ animationDelay: "200ms" }}>
            <span className="text-3xl">🐖</span>
            <p className="text-sm text-muted-foreground">
              No completed budgeted months yet. Set a budget and it banks when the month ends.
            </p>
          </div>
        ) : (
          months.map((m, i) => {
            const positive = m.saved >= 0;
            return (
              <div
                key={`${m.year}-${m.month}`}
                className="surface reveal flex items-center justify-between gap-3 p-4"
                style={{ animationDelay: `${200 + i * 50}ms` }}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold leading-tight">{formatMonthLabel({ year: m.year, month: m.month })}</div>
                  <div className="money mt-0.5 text-xs text-muted-foreground">
                    {formatCentavos(m.spent)} of {formatCentavos(m.budget)}
                  </div>
                </div>
                <span
                  className="money shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold"
                  style={{
                    color: positive ? "var(--accent)" : "var(--danger)",
                    background: positive
                      ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                      : "color-mix(in srgb, var(--danger) 14%, transparent)",
                  }}
                >
                  {positive ? "+" : "−"}{formatCentavos(Math.abs(m.saved))}
                </span>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
