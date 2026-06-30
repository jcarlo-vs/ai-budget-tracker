import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { getSavings } from "@/lib/data/savings";
import { setMonthlyBudget } from "@/lib/data/budgets";
import { createCategory } from "@/lib/data/categories";
import { addExpense } from "@/lib/data/transactions";
import type { DB } from "@/lib/db/types";

let db: DB;
let catId: number;
beforeEach(async () => {
  db = await createTestDb();
  const c = await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0 });
  catId = c.id;
});

const cur = { year: 2026, month: 6 };

describe("getSavings", () => {
  it("is zero with no budgets", async () => {
    expect(await getSavings(db, cur)).toEqual({ total: 0, months: [] });
  });

  it("sums leftover of past budgeted months (net), newest first, excluding current and unbudgeted", async () => {
    await setMonthlyBudget(db, { year: 2026, month: 4 }, 1000000); // spent 600000 -> +400000
    await setMonthlyBudget(db, { year: 2026, month: 5 }, 1000000); // spent 1200000 -> -200000 (overspend)
    await setMonthlyBudget(db, { year: 2026, month: 6 }, 1000000); // current month -> excluded
    await addExpense(db, { categoryId: catId, amount: 600000, description: "", occurredOn: "2026-04-10" });
    await addExpense(db, { categoryId: catId, amount: 1200000, description: "", occurredOn: "2026-05-15" });
    await addExpense(db, { categoryId: catId, amount: 999999, description: "", occurredOn: "2026-06-02" });

    const res = await getSavings(db, cur);
    expect(res.total).toBe(200000); // 400000 + (-200000)
    expect(res.months.map((m) => `${m.year}-${m.month}`)).toEqual(["2026-5", "2026-4"]);
    expect(res.months[0]).toMatchObject({ budget: 1000000, spent: 1200000, saved: -200000 });
    expect(res.months[1]).toMatchObject({ budget: 1000000, spent: 600000, saved: 400000 });
  });

  it("excludes a past month with transactions but no budget", async () => {
    await addExpense(db, { categoryId: catId, amount: 500000, description: "", occurredOn: "2026-03-10" });
    expect(await getSavings(db, cur)).toEqual({ total: 0, months: [] });
  });
});
