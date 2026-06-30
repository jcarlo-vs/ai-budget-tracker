import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { createCategory } from "@/lib/data/categories";
import { addExpense, updateExpense, deleteExpense, listTransactions, getItemsByTransaction } from "@/lib/data/transactions";
import { expenseItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

describe("itemized expenses", () => {
  it("addExpense with items sets amount = sum and stores retrievable items", async () => {
    const tx = await addExpense(
      db,
      { categoryId: catId, amount: 999999, description: "Palengke", occurredOn: "2026-06-10" },
      [
        { name: "Banana", amount: 2000 },
        { name: "Mango", amount: 3000 },
      ],
    );
    expect(tx.amount).toBe(5000); // sum overrides input.amount

    const map = await getItemsByTransaction(db, [tx.id]);
    const items = map.get(tx.id) ?? [];
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Banana");
    expect(items[0].amount).toBe(2000);
    expect(items[1].name).toBe("Mango");
    expect(items.reduce((a, i) => a + i.amount, 0)).toBe(tx.amount);
  });

  it("addExpense with NO items behaves like a quick expense", async () => {
    const tx = await addExpense(db, { categoryId: catId, amount: 12500, description: "Lunch", occurredOn: "2026-06-10" });
    expect(tx.amount).toBe(12500);
    const map = await getItemsByTransaction(db, [tx.id]);
    expect(map.get(tx.id) ?? []).toHaveLength(0);
  });

  it("addExpense with empty items array ignores items and uses input.amount", async () => {
    const tx = await addExpense(db, { categoryId: catId, amount: 7700, description: "Quick", occurredOn: "2026-06-10" }, []);
    expect(tx.amount).toBe(7700);
    expect((await getItemsByTransaction(db, [tx.id])).get(tx.id) ?? []).toHaveLength(0);
  });

  it("updateExpense with new items replaces old items and recomputes amount", async () => {
    const tx = await addExpense(
      db,
      { categoryId: catId, amount: 0, description: "Grocery", occurredOn: "2026-06-10" },
      [{ name: "Rice", amount: 5000 }],
    );
    expect(tx.amount).toBe(5000);

    const updated = await updateExpense(
      db,
      tx.id,
      { categoryId: catId, amount: 0, description: "Grocery", occurredOn: "2026-06-10" },
      [
        { name: "Eggs", amount: 1200 },
        { name: "Milk", amount: 1800 },
      ],
    );
    expect(updated.amount).toBe(3000);

    const items = (await getItemsByTransaction(db, [tx.id])).get(tx.id) ?? [];
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.name)).toEqual(["Eggs", "Milk"]);
  });

  it("updateExpense with undefined items leaves items untouched (back-compat)", async () => {
    const tx = await addExpense(
      db,
      { categoryId: catId, amount: 0, description: "Trip", occurredOn: "2026-06-10" },
      [{ name: "Soda", amount: 2500 }],
    );
    const updated = await updateExpense(db, tx.id, { categoryId: catId, amount: 999, description: "Trip!", occurredOn: "2026-06-11" });
    expect(updated.amount).toBe(999);
    expect(updated.description).toBe("Trip!");
    const items = (await getItemsByTransaction(db, [tx.id])).get(tx.id) ?? [];
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Soda");
  });

  it("updateExpense with empty items array clears items and uses input.amount", async () => {
    const tx = await addExpense(
      db,
      { categoryId: catId, amount: 0, description: "Trip", occurredOn: "2026-06-10" },
      [{ name: "Soda", amount: 2500 }],
    );
    const updated = await updateExpense(db, tx.id, { categoryId: catId, amount: 4200, description: "Trip", occurredOn: "2026-06-10" }, []);
    expect(updated.amount).toBe(4200);
    expect((await getItemsByTransaction(db, [tx.id])).get(tx.id) ?? []).toHaveLength(0);
  });

  it("deleting a transaction cascade-removes its items", async () => {
    const tx = await addExpense(
      db,
      { categoryId: catId, amount: 0, description: "Palengke", occurredOn: "2026-06-10" },
      [
        { name: "Banana", amount: 2000 },
        { name: "Mango", amount: 3000 },
      ],
    );
    await deleteExpense(db, tx.id);
    const remaining = await db.select().from(expenseItems).where(eq(expenseItems.transactionId, tx.id));
    expect(remaining).toHaveLength(0);
  });

  it("getItemsByTransaction groups by transaction id", async () => {
    const a = await addExpense(db, { categoryId: catId, amount: 0, description: "A", occurredOn: "2026-06-10" }, [{ name: "x", amount: 100 }]);
    const b = await addExpense(db, { categoryId: catId, amount: 0, description: "B", occurredOn: "2026-06-10" }, [{ name: "y", amount: 200 }, { name: "z", amount: 300 }]);
    const map = await getItemsByTransaction(db, [a.id, b.id]);
    expect(map.get(a.id) ?? []).toHaveLength(1);
    expect(map.get(b.id) ?? []).toHaveLength(2);
  });
});
