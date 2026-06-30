import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { localDb } from "@/lib/local/db";
import { collectChanges } from "@/lib/sync/client";
import type { LocalCategory } from "@/lib/local/types";

beforeEach(async () => {
  await Promise.all([
    localDb.categories.clear(),
    localDb.transactions.clear(),
    localDb.expenseItems.clear(),
    localDb.monthlyBudgets.clear(),
    localDb.meta.clear(),
  ]);
});

function cat(id: string, updatedAt: string): LocalCategory {
  return {
    id, name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0, sortOrder: 0,
    archived: false, createdAt: updatedAt, updatedAt, deletedAt: null,
  };
}

describe("collectChanges (client push cursor)", () => {
  it("returns only rows whose updatedAt is strictly after the client push cursor", async () => {
    await localDb.categories.bulkPut([
      cat("old", "2026-06-01T00:00:00.000Z"),
      cat("new", "2026-06-10T00:00:00.000Z"),
    ]);
    await localDb.monthlyBudgets.bulkPut([
      { id: "bOld", year: 2026, month: 5, amount: 1, updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null },
      { id: "bNew", year: 2026, month: 6, amount: 2, updatedAt: "2026-06-10T00:00:00.000Z", deletedAt: null },
    ]);

    const changes = await collectChanges("2026-06-05T00:00:00.000Z");
    expect(changes.categories.map((c) => c.id)).toEqual(["new"]);
    expect(changes.monthlyBudgets.map((b) => b.id)).toEqual(["bNew"]);
  });

  it("excludes rows stamped exactly at the cursor (uses the client cursor, not a server clock)", async () => {
    const cursor = "2026-06-05T00:00:00.000Z";
    await localDb.categories.put(cat("atCursor", cursor));
    const changes = await collectChanges(cursor);
    expect(changes.categories).toHaveLength(0);
  });

  it("collects everything since EPOCH on a first sync", async () => {
    await localDb.categories.put(cat("a", "2020-01-01T00:00:00.000Z"));
    const changes = await collectChanges("1970-01-01T00:00:00.000Z");
    expect(changes.categories.map((c) => c.id)).toEqual(["a"]);
  });
});
