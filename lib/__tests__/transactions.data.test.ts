import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { createCategory } from "@/lib/data/categories";
import { addExpense, updateExpense, deleteExpense, listTransactions } from "@/lib/data/transactions";
import type { DB } from "@/lib/db/types";

let db: DB;
let catId: number;
beforeEach(async () => {
  db = await createTestDb();
  catId = (await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 })).id;
});

describe("transaction data access", () => {
  it("adds and lists within a month", async () => {
    await addExpense(db, { categoryId: catId, amount: 12500, description: "Lunch", occurredOn: "2026-06-10" });
    await addExpense(db, { categoryId: catId, amount: 5000, description: "Snack", occurredOn: "2026-06-20" });
    await addExpense(db, { categoryId: catId, amount: 9999, description: "Old", occurredOn: "2026-05-31" });
    const june = await listTransactions(db, { categoryId: catId, ym: { year: 2026, month: 6 } });
    expect(june).toHaveLength(2);
    expect(june[0].occurredOn).toBe("2026-06-20"); // desc order
  });

  it("updates and deletes", async () => {
    const t = await addExpense(db, { categoryId: catId, amount: 100, description: "x", occurredOn: "2026-06-10" });
    const u = await updateExpense(db, t.id, { categoryId: catId, amount: 250, description: "y", occurredOn: "2026-06-11" });
    expect(u.amount).toBe(250);
    await deleteExpense(db, t.id);
    expect(await listTransactions(db, { categoryId: catId, ym: { year: 2026, month: 6 } })).toHaveLength(0);
  });
});
