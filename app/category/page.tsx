"use client";

import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { listCategories } from "@/lib/local/data/categories";
import { listTransactions, getItemsByTransaction, type TransactionWithItems } from "@/lib/local/data/transactions";
import { getYearMonth, parseYearMonth } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryDetailClient } from "@/components/category-detail-client";
import { MarkPaidButton } from "@/components/mark-paid-button";
import { Skeleton } from "@/components/skeleton";

function CategoryInner() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const ym = parseYearMonth(sp.get("y") ?? undefined, sp.get("m") ?? undefined, getYearMonth(new Date()));

  const data = useLiveQuery(
    async () => {
      if (!id) return { notFound: true as const };
      const category = (await listCategories()).find((c) => c.id === id);
      if (!category) return { notFound: true as const };
      const txns = await listTransactions({ categoryId: id, ym });
      const itemsByTx = await getItemsByTransaction(txns.map((t) => t.id));
      const transactions: TransactionWithItems[] = txns.map((t) => ({ ...t, items: itemsByTx.get(t.id) ?? [] }));
      const spent = txns.reduce((a, t) => a + t.amount, 0);
      return { notFound: false as const, category, transactions, spent };
    },
    [id, ym.year, ym.month],
  );

  if (!data) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+10rem)] pt-6">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-11 w-full" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </main>
    );
  }

  if (data.notFound) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+10rem)] pt-6">
        <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-muted-foreground">Category not found.</p>
          <Link href="/" className="text-sm font-medium text-accent">Back home</Link>
        </div>
      </main>
    );
  }

  const { category, transactions, spent } = data;
  const canMarkPaid = category.monthlyBudget > 0 && spent < category.monthlyBudget;
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+10rem)] pt-6">
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
              categoryId={category.id}
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
        <MonthSwitcher ym={ym} basePath="/category" params={{ id: category.id }} />
      </div>

      <CategoryDetailClient category={category} transactions={transactions} defaultDate={defaultDate} />
    </main>
  );
}

export default function CategoryPage() {
  return (
    <Suspense>
      <CategoryInner />
    </Suspense>
  );
}
