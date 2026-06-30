import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { ensureSeedCategories } from "@/lib/data/seed";
import { listCategories, createCategory } from "@/lib/data/categories";
import type { DB } from "@/lib/db/types";

let db: DB;
beforeEach(async () => { db = await createTestDb(); });

describe("ensureSeedCategories", () => {
  it("seeds when empty", async () => {
    await ensureSeedCategories(db);
    expect((await listCategories(db)).length).toBeGreaterThan(0);
  });
  it("is a no-op when categories exist", async () => {
    await createCategory(db, { name: "Only", emoji: "🛒", color: "#10b981", monthlyBudget: 0 });
    await ensureSeedCategories(db);
    expect(await listCategories(db)).toHaveLength(1);
  });
});
