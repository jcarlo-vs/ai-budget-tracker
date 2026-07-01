import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { localDb } from "@/lib/local/db";
import {
  listCategories, createCategory, updateCategory, deleteCategory,
  listCategoriesForMonth, visibleInMonth,
} from "@/lib/local/data/categories";
import {
  addExpense, updateExpense, deleteExpense, listTransactions, getItemsByTransaction, markCategoryPaid,
} from "@/lib/local/data/transactions";
import { getMonthlyBudget, setMonthlyBudget, getRecentBudgetBefore, deleteMonthlyBudget } from "@/lib/local/data/budgets";
import { getCategoriesWithMonthTotals, getMonthOverview } from "@/lib/local/data/overview";
import { getSavings } from "@/lib/local/data/savings";

const base = { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 };

beforeEach(async () => {
  await Promise.all([
    localDb.categories.clear(),
    localDb.transactions.clear(),
    localDb.expenseItems.clear(),
    localDb.monthlyBudgets.clear(),
    localDb.meta.clear(),
  ]);
});

describe("local categories", () => {
  it("creates and lists with uuid ids", async () => {
    const c = await createCategory(base);
    expect(typeof c.id).toBe("string");
    expect(c.id.length).toBeGreaterThan(10);
    const list = await listCategories();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Food");
    expect(list[0].monthlyBudget).toBe(500000);
  });

  it("updates", async () => {
    const c = await createCategory(base);
    await updateCategory(c.id, { ...base, name: "Groceries", monthlyBudget: 600000 });
    const list = await listCategories();
    expect(list[0].name).toBe("Groceries");
    expect(list[0].monthlyBudget).toBe(600000);
  });

  it("soft-deletes (tombstone hides from list)", async () => {
    const c = await createCategory(base);
    await deleteCategory(c.id);
    expect(await listCategories()).toHaveLength(0);
    const row = await localDb.categories.get(c.id);
    expect(row?.deletedAt).not.toBeNull();
  });

  it("orders by createdAt (insertion order) not by random uuid id", async () => {
    // ids deliberately chosen so id.localeCompare would REVERSE the createdAt order:
    // "zzzz" was created first but sorts last by id.
    await localDb.categories.bulkPut([
      { id: "zzzz", name: "First", emoji: "🍜", color: "#10b981", monthlyBudget: 0, sortOrder: 0, archived: false, scopeYear: null, scopeMonth: null, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null },
      { id: "aaaa", name: "Second", emoji: "🎮", color: "#6366f1", monthlyBudget: 0, sortOrder: 0, archived: false, scopeYear: null, scopeMonth: null, createdAt: "2026-06-02T00:00:00.000Z", updatedAt: "2026-06-02T00:00:00.000Z", deletedAt: null },
    ]);
    const list = await listCategories();
    expect(list.map((c) => c.name)).toEqual(["First", "Second"]);
  });
});

describe("category month scope", () => {
  const jul = { year: 2026, month: 7 };
  const aug = { year: 2026, month: 8 };

  it("createCategory without a scope stores null/null (permanent)", async () => {
    const c = await createCategory(base);
    expect(c.scopeYear).toBeNull();
    expect(c.scopeMonth).toBeNull();
    const stored = await localDb.categories.get(c.id);
    expect(stored?.scopeYear).toBeNull();
    expect(stored?.scopeMonth).toBeNull();
  });

  it("createCategory with a scope stores that year/month (temporary)", async () => {
    const c = await createCategory(base, { year: 2026, month: 7 });
    expect(c.scopeYear).toBe(2026);
    expect(c.scopeMonth).toBe(7);
    const stored = await localDb.categories.get(c.id);
    expect(stored?.scopeYear).toBe(2026);
    expect(stored?.scopeMonth).toBe(7);
  });

  it("visibleInMonth: permanent shows in any month; temporary only in its month", () => {
    const permanent = { scopeYear: null, scopeMonth: null };
    const tempJul = { scopeYear: 2026, scopeMonth: 7 };
    expect(visibleInMonth(permanent, jul)).toBe(true);
    expect(visibleInMonth(permanent, aug)).toBe(true);
    expect(visibleInMonth(tempJul, jul)).toBe(true);
    expect(visibleInMonth(tempJul, aug)).toBe(false);
    // same month number in a different year must not match
    expect(visibleInMonth(tempJul, { year: 2025, month: 7 })).toBe(false);
  });

  it("listCategoriesForMonth includes permanent + this-month temporary, hides other-month", async () => {
    const permanent = await createCategory({ ...base, name: "Rent" });
    const temp = await createCategory({ ...base, name: "Vacation" }, jul);

    const julList = await listCategoriesForMonth(jul);
    expect(julList.map((c) => c.id).sort()).toEqual([permanent.id, temp.id].sort());

    const augList = await listCategoriesForMonth(aug);
    expect(augList.map((c) => c.id)).toEqual([permanent.id]);
    expect(augList.some((c) => c.id === temp.id)).toBe(false);
  });
});

describe("local transactions", () => {
  let catId: string;
  beforeEach(async () => {
    catId = (await createCategory({ ...base, monthlyBudget: 500000 })).id;
  });

  it("adds and lists within a month, newest first", async () => {
    await addExpense({ categoryId: catId, amount: 12500, description: "Lunch", occurredOn: "2026-06-10" });
    await addExpense({ categoryId: catId, amount: 5000, description: "Snack", occurredOn: "2026-06-20" });
    await addExpense({ categoryId: catId, amount: 9999, description: "Old", occurredOn: "2026-05-31" });
    const june = await listTransactions({ categoryId: catId, ym: { year: 2026, month: 6 } });
    expect(june).toHaveLength(2);
    expect(june[0].occurredOn).toBe("2026-06-20");
  });

  it("updates and soft-deletes", async () => {
    const t = await addExpense({ categoryId: catId, amount: 100, description: "x", occurredOn: "2026-06-10" });
    const u = await updateExpense(t.id, { categoryId: catId, amount: 250, description: "y", occurredOn: "2026-06-11" });
    expect(u.amount).toBe(250);
    await deleteExpense(t.id);
    expect(await listTransactions({ categoryId: catId, ym: { year: 2026, month: 6 } })).toHaveLength(0);
  });

  it("addExpense with items sets amount = sum and stores retrievable items", async () => {
    const tx = await addExpense(
      { categoryId: catId, amount: 999999, description: "Palengke", occurredOn: "2026-06-10" },
      [{ name: "Banana", amount: 2000 }, { name: "Mango", amount: 3000 }],
    );
    expect(tx.amount).toBe(5000);
    const items = (await getItemsByTransaction([tx.id])).get(tx.id) ?? [];
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Banana");
    expect(items.reduce((a, i) => a + i.amount, 0)).toBe(tx.amount);
  });

  it("addExpense with empty items array uses input.amount", async () => {
    const tx = await addExpense({ categoryId: catId, amount: 7700, description: "Quick", occurredOn: "2026-06-10" }, []);
    expect(tx.amount).toBe(7700);
    expect((await getItemsByTransaction([tx.id])).get(tx.id) ?? []).toHaveLength(0);
  });

  it("updateExpense replaces items and recomputes amount", async () => {
    const tx = await addExpense(
      { categoryId: catId, amount: 0, description: "Grocery", occurredOn: "2026-06-10" },
      [{ name: "Rice", amount: 5000 }],
    );
    const updated = await updateExpense(
      tx.id,
      { categoryId: catId, amount: 0, description: "Grocery", occurredOn: "2026-06-10" },
      [{ name: "Eggs", amount: 1200 }, { name: "Milk", amount: 1800 }],
    );
    expect(updated.amount).toBe(3000);
    const items = (await getItemsByTransaction([tx.id])).get(tx.id) ?? [];
    expect(items.map((i) => i.name)).toEqual(["Eggs", "Milk"]);
  });

  it("updateExpense with undefined items leaves items untouched", async () => {
    const tx = await addExpense(
      { categoryId: catId, amount: 0, description: "Trip", occurredOn: "2026-06-10" },
      [{ name: "Soda", amount: 2500 }],
    );
    const updated = await updateExpense(tx.id, { categoryId: catId, amount: 999, description: "Trip!", occurredOn: "2026-06-11" });
    expect(updated.amount).toBe(999);
    const items = (await getItemsByTransaction([tx.id])).get(tx.id) ?? [];
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Soda");
  });

  it("deleting a transaction tombstones its items", async () => {
    const tx = await addExpense(
      { categoryId: catId, amount: 0, description: "Palengke", occurredOn: "2026-06-10" },
      [{ name: "Banana", amount: 2000 }, { name: "Mango", amount: 3000 }],
    );
    await deleteExpense(tx.id);
    expect((await getItemsByTransaction([tx.id])).get(tx.id) ?? []).toHaveLength(0);
  });

  it("markCategoryPaid logs the remaining amount", async () => {
    await addExpense({ categoryId: catId, amount: 200000, description: "", occurredOn: "2026-06-05" });
    await markCategoryPaid(catId, { year: 2026, month: 6 });
    const rows = await getCategoriesWithMonthTotals({ year: 2026, month: 6 });
    expect(rows[0].spent).toBe(500000); // filled to budget
  });
});

describe("local budgets", () => {
  it("returns null when no budget set", async () => {
    expect(await getMonthlyBudget({ year: 2026, month: 6 })).toBeNull();
  });
  it("upserts by (year,month)", async () => {
    await setMonthlyBudget({ year: 2026, month: 6 }, 2000000);
    await setMonthlyBudget({ year: 2026, month: 6 }, 2500000);
    expect(await getMonthlyBudget({ year: 2026, month: 6 })).toBe(2500000);
    const rows = await localDb.monthlyBudgets.where("[year+month]").equals([2026, 6]).toArray();
    expect(rows.filter((r) => r.deletedAt == null)).toHaveLength(1);
  });
  it("finds the most recent budget strictly before a month", async () => {
    await setMonthlyBudget({ year: 2026, month: 4 }, 1000000);
    await setMonthlyBudget({ year: 2026, month: 5 }, 1500000);
    expect(await getRecentBudgetBefore({ year: 2026, month: 6 })).toBe(1500000);
    expect(await getRecentBudgetBefore({ year: 2026, month: 4 })).toBeNull();
  });
  it("clears (tombstones) a budget", async () => {
    await setMonthlyBudget({ year: 2026, month: 5 }, 1500000);
    await deleteMonthlyBudget({ year: 2026, month: 5 });
    expect(await getMonthlyBudget({ year: 2026, month: 5 })).toBeNull();
  });
});

describe("local overview", () => {
  it("totals spend per category for the month", async () => {
    const food = await createCategory({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    const fun = await createCategory({ name: "Fun", emoji: "🎮", color: "#6366f1", monthlyBudget: 200000 });
    await addExpense({ categoryId: food.id, amount: 12500, description: "", occurredOn: "2026-06-10" });
    await addExpense({ categoryId: food.id, amount: 7500, description: "", occurredOn: "2026-06-15" });
    await addExpense({ categoryId: fun.id, amount: 30000, description: "", occurredOn: "2026-06-01" });
    await addExpense({ categoryId: food.id, amount: 99999, description: "", occurredOn: "2026-05-20" });
    const rows = await getCategoriesWithMonthTotals({ year: 2026, month: 6 });
    expect(rows.find((r) => r.category.id === food.id)!.spent).toBe(20000);
    expect(rows.find((r) => r.category.id === fun.id)!.spent).toBe(30000);
  });
  it("computes month overview totals", async () => {
    const food = await createCategory({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    await addExpense({ categoryId: food.id, amount: 20000, description: "", occurredOn: "2026-06-10" });
    const o = await getMonthOverview({ year: 2026, month: 6 });
    expect(o).toEqual({ spent: 20000, budget: 500000, remaining: 480000 });
  });

  it("excludes other-month temporary categories from the list and Allocated", async () => {
    const permanent = await createCategory({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    // Temporary category scoped to July, plus a July-dated expense on it.
    const julTemp = await createCategory(
      { name: "Vacation", emoji: "🏖️", color: "#0a84ff", monthlyBudget: 300000 },
      { year: 2026, month: 7 },
    );
    await addExpense({ categoryId: julTemp.id, amount: 90000, description: "", occurredOn: "2026-07-05" });

    // In August the temporary category (and its budget) must not appear.
    const augRows = await getCategoriesWithMonthTotals({ year: 2026, month: 8 });
    expect(augRows.map((r) => r.category.id)).toEqual([permanent.id]);
    const augAllocated = augRows.reduce((a, r) => a + r.category.monthlyBudget, 0);
    expect(augAllocated).toBe(500000);

    // In July it appears with its own spend and budget.
    const julRows = await getCategoriesWithMonthTotals({ year: 2026, month: 7 });
    expect(julRows.map((r) => r.category.id).sort()).toEqual([permanent.id, julTemp.id].sort());
    expect(julRows.find((r) => r.category.id === julTemp.id)!.spent).toBe(90000);
    const julAllocated = julRows.reduce((a, r) => a + r.category.monthlyBudget, 0);
    expect(julAllocated).toBe(800000);
  });
});

describe("local savings", () => {
  let catId: string;
  const cur = { year: 2026, month: 6 };
  beforeEach(async () => {
    catId = (await createCategory({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0 })).id;
  });

  it("is zero with no budgets", async () => {
    expect(await getSavings(cur)).toEqual({ total: 0, months: [] });
  });

  it("sums leftover of past budgeted months, newest first, excluding current and unbudgeted", async () => {
    await setMonthlyBudget({ year: 2026, month: 4 }, 1000000);
    await setMonthlyBudget({ year: 2026, month: 5 }, 1000000);
    await setMonthlyBudget({ year: 2026, month: 6 }, 1000000);
    await addExpense({ categoryId: catId, amount: 600000, description: "", occurredOn: "2026-04-10" });
    await addExpense({ categoryId: catId, amount: 1200000, description: "", occurredOn: "2026-05-15" });
    await addExpense({ categoryId: catId, amount: 999999, description: "", occurredOn: "2026-06-02" });

    const res = await getSavings(cur);
    expect(res.total).toBe(200000);
    expect(res.months.map((m) => `${m.year}-${m.month}`)).toEqual(["2026-5", "2026-4"]);
    expect(res.months[0]).toMatchObject({ budget: 1000000, spent: 1200000, saved: -200000 });
    expect(res.months[1]).toMatchObject({ budget: 1000000, spent: 600000, saved: 400000 });
  });

  it("excludes a past month with transactions but no budget", async () => {
    await addExpense({ categoryId: catId, amount: 500000, description: "", occurredOn: "2026-03-10" });
    expect(await getSavings(cur)).toEqual({ total: 0, months: [] });
  });
});
