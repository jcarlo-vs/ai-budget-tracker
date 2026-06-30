import Link from "next/link";
import { db } from "@/lib/db/client";
import { getCategoriesWithMonthTotals } from "@/lib/data/overview";
import { getMonthlyBudget } from "@/lib/data/budgets";
import { getYearMonth, parseYearMonth, formatMonthLabel } from "@/lib/month";
import { formatCentavos } from "@/lib/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryCard } from "@/components/category-card";
import { DashboardClient } from "@/components/dashboard-client";
import { ensureSeedCategories } from "@/lib/data/seed";

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
  const remaining = budget != null ? budget - spent : 0;
  const categories = rows.map((r) => r.category);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-28 pt-6">
      <div className="reveal">
        <MonthSwitcher ym={ym} basePath="/" />
      </div>

      <section className="surface reveal relative overflow-hidden p-6" style={{ animationDelay: "60ms" }}>
        <div
          aria-hidden
          className="glow-pulse pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 70%)" }}
        />
        <span className="eyebrow">Spent in {formatMonthLabel(ym)}</span>
        <div className="money display mt-2 text-5xl font-bold leading-none tracking-tight">
          {formatCentavos(spent)}
        </div>

        {budget != null ? (
          <div className="mt-5 space-y-4">
            <BudgetBar spent={spent} budget={budget} />
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[var(--field)] px-3 py-2 ring-1 ring-inset ring-[var(--border)]">
                <div className="eyebrow">Budget</div>
                <div className="money mt-0.5 text-sm font-semibold">{formatCentavos(budget)}</div>
              </div>
              <div className="rounded-xl bg-[var(--field)] px-3 py-2 ring-1 ring-inset ring-[var(--border)]">
                <div className="eyebrow">Allocated</div>
                <div className="money mt-0.5 text-sm font-semibold">{formatCentavos(allocated)}</div>
              </div>
              <div className="rounded-xl bg-[var(--field)] px-3 py-2 ring-1 ring-inset ring-[var(--border)]">
                <div className="eyebrow">{remaining >= 0 ? "Remaining" : "Over by"}</div>
                <div className={`money mt-0.5 text-sm font-semibold ${remaining >= 0 ? "text-accent" : "text-danger"}`}>
                  {formatCentavos(Math.abs(remaining))}
                </div>
              </div>
            </div>
            <p className="px-0.5 text-xs text-muted-foreground">
              Allocated = sum of your category budgets ({formatCentavos(allocated)} across {rows.length} categories).
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="w-full rounded-xl bg-[var(--field)] px-3 py-2 ring-1 ring-inset ring-[var(--border)]">
              <div className="eyebrow">Allocated to categories</div>
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
        )}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow reveal px-1" style={{ animationDelay: "120ms" }}>Categories</h2>
        {rows.length === 0 && (
          <div className="surface reveal flex flex-col items-center gap-2 px-6 py-12 text-center" style={{ animationDelay: "160ms" }}>
            <span className="text-3xl">🍃</span>
            <p className="text-sm text-muted-foreground">No categories yet. Add one in Manage.</p>
          </div>
        )}
        {rows.map(({ category, spent }, i) => (
          <div key={category.id} className="reveal" style={{ animationDelay: `${160 + i * 55}ms` }}>
            <CategoryCard category={category} spent={spent} />
          </div>
        ))}
      </section>

      <DashboardClient categories={categories} defaultDate={defaultDate} />
    </main>
  );
}
