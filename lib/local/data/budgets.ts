import { localDb } from "@/lib/local/db";
import { touch } from "@/lib/local/touch";
import type { LocalMonthlyBudget } from "@/lib/local/types";
import type { YearMonth } from "@/lib/month";

const now = () => new Date().toISOString();

// The active (non-tombstoned) budget for a given month, if any. A tombstoned row
// and a live row for the same (year,month) can coexist after a clear + reset.
async function activeBudget(ym: YearMonth): Promise<LocalMonthlyBudget | undefined> {
  const rows = await localDb.monthlyBudgets.where("[year+month]").equals([ym.year, ym.month]).toArray();
  return rows.find((b) => b.deletedAt == null);
}

export async function getMonthlyBudget(ym: YearMonth): Promise<number | null> {
  const row = await activeBudget(ym);
  return row ? row.amount : null;
}

export async function setMonthlyBudget(ym: YearMonth, amount: number): Promise<void> {
  const ts = now();
  const existing = await activeBudget(ym);
  if (existing) {
    await localDb.monthlyBudgets.update(existing.id, { amount, updatedAt: ts });
  } else {
    await localDb.monthlyBudgets.put({
      id: crypto.randomUUID(),
      year: ym.year,
      month: ym.month,
      amount,
      updatedAt: ts,
      deletedAt: null,
    });
  }
  touch();
}

export async function getRecentBudgetBefore(ym: YearMonth): Promise<number | null> {
  const all = await localDb.monthlyBudgets.toArray();
  const target = ym.year * 12 + ym.month;
  const before = all
    .filter((b) => b.deletedAt == null && b.year * 12 + b.month < target)
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));
  return before.length > 0 ? before[0].amount : null;
}

export async function deleteMonthlyBudget(ym: YearMonth): Promise<void> {
  const existing = await activeBudget(ym);
  if (existing) {
    const ts = now();
    await localDb.monthlyBudgets.update(existing.id, { deletedAt: ts, updatedAt: ts });
    touch();
  }
}
