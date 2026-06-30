import { localDb } from "@/lib/local/db";
import { listCategories } from "@/lib/local/data/categories";
import type { LocalCategory } from "@/lib/local/types";
import { monthRange, type YearMonth } from "@/lib/month";

export async function getCategoriesWithMonthTotals(
  ym: YearMonth,
): Promise<Array<{ category: LocalCategory; spent: number }>> {
  const { start, end } = monthRange(ym);
  const [cats, txns] = await Promise.all([listCategories(), localDb.transactions.toArray()]);
  const byId = new Map<string, number>();
  for (const t of txns) {
    if (t.deletedAt != null || t.occurredOn < start || t.occurredOn >= end) continue;
    byId.set(t.categoryId, (byId.get(t.categoryId) ?? 0) + t.amount);
  }
  return cats.map((category) => ({ category, spent: byId.get(category.id) ?? 0 }));
}

export async function getMonthOverview(
  ym: YearMonth,
): Promise<{ spent: number; budget: number; remaining: number }> {
  const rows = await getCategoriesWithMonthTotals(ym);
  const spent = rows.reduce((acc, r) => acc + r.spent, 0);
  const budget = rows.reduce((acc, r) => acc + r.category.monthlyBudget, 0);
  return { spent, budget, remaining: budget - spent };
}
