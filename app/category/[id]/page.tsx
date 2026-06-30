import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { listCategories } from "@/lib/data/categories";
import { listTransactions, getItemsByTransaction, type TransactionWithItems } from "@/lib/data/transactions";
import { getYearMonth, parseYearMonth } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryDetailClient } from "@/components/category-detail-client";
import { MarkPaidButton } from "@/components/mark-paid-button";
import { markCategoryPaidAction } from "@/app/actions/expenses";

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
  const itemsByTx = await getItemsByTransaction(db, txns.map((t) => t.id));
  const txnsWithItems: TransactionWithItems[] = txns.map((t) => ({ ...t, items: itemsByTx.get(t.id) ?? [] }));
  const canMarkPaid = category.monthlyBudget > 0 && spent < category.monthlyBudget;
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
        <div className="mb-4 flex items-center gap-3.5">
          <span
            className="tile h-12 w-12 text-2xl"
            style={{ "--tile": category.color } as CSSProperties}
          >
            {category.emoji}
          </span>
          <span className="display min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{category.name}</span>
          {canMarkPaid && (
            <MarkPaidButton
              action={markCategoryPaidAction}
              categoryId={categoryId}
              categoryName={category.name}
              remaining={category.monthlyBudget - spent}
              year={ym.year}
              month={ym.month}
              className="shrink-0"
            />
          )}
        </div>
        <BudgetBar spent={spent} budget={category.monthlyBudget} color={category.color} />
      </header>

      <div className="reveal" style={{ animationDelay: "100ms" }}>
        <MonthSwitcher ym={ym} basePath={`/category/${categoryId}`} />
      </div>

      <CategoryDetailClient category={category} transactions={txnsWithItems} defaultDate={defaultDate} />
    </main>
  );
}
