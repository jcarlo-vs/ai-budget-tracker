import Link from "next/link";
import { db } from "@/lib/db/client";
import { getCategoriesWithMonthTotals } from "@/lib/data/overview";
import { getMonthlyBudget } from "@/lib/data/budgets";
import { getYearMonth, parseYearMonth, formatMonthLabel } from "@/lib/month";
import { formatCentavos } from "@/lib/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetGauge } from "@/components/budget-gauge";
import { CategoryCard } from "@/components/category-card";
import { DashboardClient } from "@/components/dashboard-client";
import { ensureSeedCategories } from "@/lib/data/seed";
import { markCategoryPaidAction } from "@/app/actions/expenses";

export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const sp = await searchParams;
  const ym = parseYearMonth(sp.y, sp.m, getYearMonth(new Date()));

  await ensureSeedCategories(db);

  const [rows, budget] = await Promise.all([
    getCategoriesWithMonthTotals(db, ym),
    getMonthlyBudget(db, ym),
  ]);
  const spent = rows.reduce((acc, r) => acc + r.spent, 0);
  const allocated = rows.reduce((acc, r) => acc + r.category.monthlyBudget, 0);
  const categories = rows.map((r) => r.category);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-28 pt-6">
      <div className="reveal">
        <MonthSwitcher ym={ym} basePath="/" />
      </div>

      <section className="surface reveal relative overflow-hidden p-5" style={{ animationDelay: "60ms" }}>
        <div
          aria-hidden
          className="glow-pulse pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 70%)" }}
        />

        {budget != null ? (
          <div className="space-y-5">
            {/* Hero: circular Safe-to-Spend gauge (ring = spent/budget,
                center = remaining). The month is set by the MonthSwitcher above. */}
            <BudgetGauge spent={spent} budget={budget} allocated={allocated} />

            {/* Budget · Allocated · Spent — grouped as one segmented glass strip.
                Remaining now lives in the gauge center. Values are tabular and
                clamp-sized with per-cell clipping so they never overflow a
                narrow phone. */}
            <div className="grid grid-cols-3 overflow-hidden rounded-2xl bg-[var(--field)] ring-1 ring-inset ring-[var(--border)]">
              {[
                { label: "Budget", value: formatCentavos(budget), cls: "text-foreground" },
                { label: "Allocated", value: formatCentavos(allocated), cls: "text-foreground" },
                {
                  label: budget - spent >= 0 ? "Remaining" : "Over by",
                  value: formatCentavos(Math.abs(budget - spent)),
                  cls: budget - spent >= 0 ? "text-accent" : "text-danger",
                },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`min-w-0 overflow-hidden px-2.5 py-3 ${i > 0 ? "border-l border-[var(--border)]" : ""}`}
                >
                  <div className="truncate text-[0.6875rem] font-medium text-muted-foreground">{s.label}</div>
                  <div className={`money mt-1 whitespace-nowrap text-[clamp(0.6875rem,3.2vw,0.9375rem)] font-semibold ${s.cls}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <p className="px-0.5 text-xs text-muted-foreground">
              Allocated = sum of your category budgets ({formatCentavos(allocated)} across {rows.length} categories).
            </p>
          </div>
        ) : (
          <>
            <span className="eyebrow">Spent in {formatMonthLabel(ym)}</span>
            <div className="money display mt-1.5 text-5xl font-bold leading-none tracking-tight">
              {formatCentavos(spent)}
            </div>
            <div className="mt-4 space-y-3">
              <div className="w-full rounded-2xl bg-[var(--field)] px-3.5 py-2.5 ring-1 ring-inset ring-[var(--border)]">
                <div className="text-[0.6875rem] font-medium text-muted-foreground">Allocated to categories</div>
                <div className="money mt-0.5 font-semibold">{formatCentavos(allocated)}</div>
              </div>
              <Link
                href={`/categories?y=${ym.year}&m=${ym.month}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent"
              >
                Set a monthly budget
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow reveal px-1" style={{ animationDelay: "150ms" }}>Categories</h2>
        {rows.length === 0 && (
          <div className="surface reveal flex flex-col items-center gap-2 px-6 py-12 text-center" style={{ animationDelay: "190ms" }}>
            <span className="text-3xl">🍃</span>
            <p className="text-sm text-muted-foreground">No categories yet. Add one in Manage.</p>
          </div>
        )}
        {rows.map(({ category, spent }, i) => (
          <div key={category.id} className="reveal" style={{ animationDelay: `${190 + i * 55}ms` }}>
            <CategoryCard category={category} spent={spent} ym={ym} markPaidAction={markCategoryPaidAction} />
          </div>
        ))}
      </section>

      <DashboardClient categories={categories} defaultDate={defaultDate} />
    </main>
  );
}
