import { db } from "@/lib/db/client";
import { listCategories } from "@/lib/data/categories";
import { getMonthlyBudget, getRecentBudgetBefore } from "@/lib/data/budgets";
import { getYearMonth, parseYearMonth, formatMonthLabel } from "@/lib/month";
import { CategoryManager } from "@/components/category-manager";
import { BudgetForm } from "@/components/budget-form";
import { MonthSwitcher } from "@/components/month-switcher";
import { logoutAction } from "@/app/actions/auth";

export default async function CategoriesPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const sp = await searchParams;
  const ym = parseYearMonth(sp.y, sp.m, getYearMonth(new Date()));
  const [categories, currentAmount, suggested] = await Promise.all([
    listCategories(db),
    getMonthlyBudget(db, ym),
    getRecentBudgetBefore(db, ym),
  ]);

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 pb-28 pt-6">
      <div className="reveal flex items-center justify-between">
        <h1 className="display text-2xl font-bold tracking-tight">Manage</h1>
        <form action={logoutAction}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Log out
          </button>
        </form>
      </div>

      <div className="reveal space-y-3" style={{ animationDelay: "60ms" }}>
        <MonthSwitcher ym={ym} basePath="/categories" />
        <BudgetForm
          key={`${ym.year}-${ym.month}-${currentAmount ?? "none"}`}
          year={ym.year}
          month={ym.month}
          label={formatMonthLabel(ym)}
          currentAmount={currentAmount}
          suggested={suggested}
        />
        <p className="px-1 text-xs text-muted-foreground">
          Use ‹ › to set a budget for a past or future month. Past months bank into Savings.
        </p>
      </div>

      <div className="reveal space-y-3" style={{ animationDelay: "120ms" }}>
        <h2 className="eyebrow px-1">Categories</h2>
        <CategoryManager categories={categories} />
      </div>
    </main>
  );
}
