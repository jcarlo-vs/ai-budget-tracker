import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { getYearMonth, parseYearMonth } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryDetailClient } from "@/components/category-detail-client";

export default async function CategoryPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) notFound();

  const category = (await listCategories(db)).find((c) => c.id === categoryId);
  if (!category) notFound();

  const now = getYearMonth(new Date());
  const ym = parseYearMonth(sp.y, sp.m, now);
  const txns = await listTransactions(db, { categoryId, ym });
  const spent = txns.reduce((a, t) => a + t.amount, 0);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-6">
      <Link href="/" className="reveal inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="m15 6-6 6 6 6" />
        </svg>
        Home
      </Link>

      <header className="surface reveal relative overflow-hidden p-5" style={{ animationDelay: "50ms" }}>
        <span
          aria-hidden
          className="absolute inset-y-4 left-0 w-1 rounded-full"
          style={{ background: category.color, boxShadow: `0 0 12px -1px ${category.color}` }}
        />
        <div className="mb-4 flex items-center gap-3 pl-2">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ring-1 ring-inset ring-[var(--border)]"
            style={{ background: `color-mix(in srgb, ${category.color} 22%, transparent)` }}
          >
            {category.emoji}
          </span>
          <span className="display text-xl font-semibold tracking-tight">{category.name}</span>
        </div>
        <div className="pl-2">
          <BudgetBar spent={spent} budget={category.monthlyBudget} color={category.color} />
        </div>
      </header>

      <div className="reveal" style={{ animationDelay: "100ms" }}>
        <MonthSwitcher ym={ym} basePath={`/category/${categoryId}`} />
      </div>

      <CategoryDetailClient category={category} transactions={txns} defaultDate={defaultDate} />
    </main>
  );
}
