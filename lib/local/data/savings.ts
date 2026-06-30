import { localDb } from "@/lib/local/db";
import { monthKey, type YearMonth } from "@/lib/month";

export interface SavingsMonth {
  year: number;
  month: number;
  budget: number;
  spent: number;
  saved: number;
}

export async function getSavings(
  currentYm: YearMonth,
): Promise<{ total: number; months: SavingsMonth[] }> {
  const [budgets, txns] = await Promise.all([
    localDb.monthlyBudgets.toArray(),
    localDb.transactions.toArray(),
  ]);

  // Sum active spend keyed by the transaction's YYYY-MM.
  const spentByKey = new Map<string, number>();
  for (const t of txns) {
    if (t.deletedAt != null) continue;
    const key = t.occurredOn.slice(0, 7); // "YYYY-MM" from a YYYY-MM-DD date
    spentByKey.set(key, (spentByKey.get(key) ?? 0) + t.amount);
  }

  const cur = currentYm.year * 12 + currentYm.month;
  const months: SavingsMonth[] = budgets
    .filter((b) => b.deletedAt == null && b.year * 12 + b.month < cur)
    .map((b) => {
      const spent = spentByKey.get(monthKey({ year: b.year, month: b.month })) ?? 0;
      return { year: b.year, month: b.month, budget: b.amount, spent, saved: b.amount - spent };
    })
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));

  const total = months.reduce((acc, m) => acc + m.saved, 0);
  return { total, months };
}
