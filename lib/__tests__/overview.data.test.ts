import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { createCategory } from "@/lib/data/categories";
import { addExpense } from "@/lib/data/transactions";
import { getCategoriesWithMonthTotals, getMonthOverview } from "@/lib/data/overview";
import type { DB } from "@/lib/db/types";

let db: DB;
beforeEach(async () => { db = await createTestDb(); });

describe("overview", () => {
  it("totals spend per category for the month", async () => {
    const food = await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    const fun = await createCategory(db, { name: "Fun", emoji: "🎮", color: "#6366f1", monthlyBudget: 200000 });
    await addExpense(db, { categoryId: food.id, amount: 12500, description: "", occurredOn: "2026-06-10" });
    await addExpense(db, { categoryId: food.id, amount: 7500, description: "", occurredOn: "2026-06-15" });
    await addExpense(db, { categoryId: fun.id, amount: 30000, description: "", occurredOn: "2026-06-01" });
    await addExpense(db, { categoryId: food.id, amount: 99999, description: "", occurredOn: "2026-05-20" }); // other month

    const rows = await getCategoriesWithMonthTotals(db, { year: 2026, month: 6 });
    const foodRow = rows.find(r => r.category.id === food.id)!;
    const funRow = rows.find(r => r.category.id === fun.id)!;
    expect(foodRow.spent).toBe(20000);
    expect(funRow.spent).toBe(30000);
  });

  it("computes month overview totals", async () => {
    const food = await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    await addExpense(db, { categoryId: food.id, amount: 20000, description: "", occurredOn: "2026-06-10" });
    const o = await getMonthOverview(db, { year: 2026, month: 6 });
    expect(o.spent).toBe(20000);
    expect(o.budget).toBe(500000);
    expect(o.remaining).toBe(480000);
  });
});
