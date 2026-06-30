import { and, eq, lt, or, desc } from "drizzle-orm";
import { monthlyBudgets } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import type { YearMonth } from "@/lib/month";

export async function getMonthlyBudget(db: DB, ym: YearMonth): Promise<number | null> {
  const [row] = await db
    .select()
    .from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.year, ym.year), eq(monthlyBudgets.month, ym.month)));
  return row ? row.amount : null;
}

export async function setMonthlyBudget(db: DB, ym: YearMonth, amount: number): Promise<void> {
  await db
    .insert(monthlyBudgets)
    .values({ year: ym.year, month: ym.month, amount })
    .onConflictDoUpdate({ target: [monthlyBudgets.year, monthlyBudgets.month], set: { amount } });
}

export async function getRecentBudgetBefore(db: DB, ym: YearMonth): Promise<number | null> {
  const [row] = await db
    .select()
    .from(monthlyBudgets)
    .where(
      or(
        lt(monthlyBudgets.year, ym.year),
        and(eq(monthlyBudgets.year, ym.year), lt(monthlyBudgets.month, ym.month)),
      ),
    )
    .orderBy(desc(monthlyBudgets.year), desc(monthlyBudgets.month))
    .limit(1);
  return row ? row.amount : null;
}

export async function deleteMonthlyBudget(db: DB, ym: YearMonth): Promise<void> {
  await db
    .delete(monthlyBudgets)
    .where(and(eq(monthlyBudgets.year, ym.year), eq(monthlyBudgets.month, ym.month)));
}
