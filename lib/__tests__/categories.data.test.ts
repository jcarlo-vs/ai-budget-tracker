import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { listCategories, createCategory, updateCategory, deleteCategory } from "@/lib/data/categories";
import type { DB } from "@/lib/db/types";

let db: DB;
const base = { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 };

beforeEach(async () => { db = await createTestDb(); });

describe("category data access", () => {
  it("creates and lists", async () => {
    await createCategory(db, base);
    const list = await listCategories(db);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Food");
    expect(list[0].monthlyBudget).toBe(500000);
  });

  it("updates", async () => {
    const c = await createCategory(db, base);
    const updated = await updateCategory(db, c.id, { ...base, name: "Groceries", monthlyBudget: 600000 });
    expect(updated.name).toBe("Groceries");
    expect(updated.monthlyBudget).toBe(600000);
  });

  it("deletes", async () => {
    const c = await createCategory(db, base);
    await deleteCategory(db, c.id);
    expect(await listCategories(db)).toHaveLength(0);
  });

  it("excludes archived from list", async () => {
    const c = await createCategory(db, base);
    await db.update((await import("@/lib/db/schema")).categories)
      .set({ archived: true })
      .where((await import("drizzle-orm")).eq((await import("@/lib/db/schema")).categories.id, c.id));
    expect(await listCategories(db)).toHaveLength(0);
  });
});
