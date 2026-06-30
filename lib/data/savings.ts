import { sql } from "drizzle-orm";
import { monthlyBudgets, transactions } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { monthKey, type YearMonth } from "@/lib/month";

export interface SavingsMonth {
  year: number;
  month: number;
  budget: number;
  spent: number;
  saved: number;
}

export async function getSavings(
  db: DB,
  currentYm: YearMonth,
): Promise<{ total: number; months: SavingsMonth[] }> {
  const budgets = await db.select().from(monthlyBudgets);
  const sums = await db
    .select({
      period: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .groupBy(sql`to_char(${transactions.occurredOn}, 'YYYY-MM')`);

  const spentByKey = new Map(sums.map((s) => [s.period, Number(s.total)]));
  const cur = currentYm.year * 12 + currentYm.month;

  const months: SavingsMonth[] = budgets
    .filter((b) => b.year * 12 + b.month < cur)
    .map((b) => {
      const spent = spentByKey.get(monthKey({ year: b.year, month: b.month })) ?? 0;
      return { year: b.year, month: b.month, budget: b.amount, spent, saved: b.amount - spent };
    })
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));

  const total = months.reduce((acc, m) => acc + m.saved, 0);
  return { total, months };
}
