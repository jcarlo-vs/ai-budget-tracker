import { and, gte, lt, sql } from "drizzle-orm";
import { categories, transactions, type Category } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { monthRange, type YearMonth } from "@/lib/month";
import { listCategories } from "@/lib/data/categories";

export async function getCategoriesWithMonthTotals(
  db: DB,
  ym: YearMonth,
): Promise<Array<{ category: Category; spent: number }>> {
  const { start, end } = monthRange(ym);
  const cats = await listCategories(db);
  const sums = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .where(and(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end)))
    .groupBy(transactions.categoryId);

  const byId = new Map(sums.map(s => [s.categoryId, Number(s.total)]));
  return cats.map(category => ({ category, spent: byId.get(category.id) ?? 0 }));
}

export async function getMonthOverview(
  db: DB,
  ym: YearMonth,
): Promise<{ spent: number; budget: number; remaining: number }> {
  const rows = await getCategoriesWithMonthTotals(db, ym);
  const spent = rows.reduce((acc, r) => acc + r.spent, 0);
  const budget = rows.reduce((acc, r) => acc + r.category.monthlyBudget, 0);
  return { spent, budget, remaining: budget - spent };
}
