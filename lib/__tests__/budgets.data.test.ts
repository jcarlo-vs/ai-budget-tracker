import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { getMonthlyBudget, setMonthlyBudget, getRecentBudgetBefore, deleteMonthlyBudget } from "@/lib/data/budgets";
import type { DB } from "@/lib/db/types";

let db: DB;
beforeEach(async () => { db = await createTestDb(); });

describe("monthly budget data access", () => {
  it("returns null when no budget set", async () => {
    expect(await getMonthlyBudget(db, { year: 2026, month: 6 })).toBeNull();
  });
  it("sets then gets a budget", async () => {
    await setMonthlyBudget(db, { year: 2026, month: 6 }, 2000000);
    expect(await getMonthlyBudget(db, { year: 2026, month: 6 })).toBe(2000000);
  });
  it("upserts (no duplicate, updates amount)", async () => {
    await setMonthlyBudget(db, { year: 2026, month: 6 }, 2000000);
    await setMonthlyBudget(db, { year: 2026, month: 6 }, 2500000);
    expect(await getMonthlyBudget(db, { year: 2026, month: 6 })).toBe(2500000);
  });
  it("finds the most recent budget strictly before a month", async () => {
    await setMonthlyBudget(db, { year: 2026, month: 4 }, 1000000);
    await setMonthlyBudget(db, { year: 2026, month: 5 }, 1500000);
    expect(await getRecentBudgetBefore(db, { year: 2026, month: 6 })).toBe(1500000);
    expect(await getRecentBudgetBefore(db, { year: 2026, month: 4 })).toBeNull();
  });
  it("clears (deletes) a budget", async () => {
    await setMonthlyBudget(db, { year: 2026, month: 5 }, 1500000);
    await deleteMonthlyBudget(db, { year: 2026, month: 5 });
    expect(await getMonthlyBudget(db, { year: 2026, month: 5 })).toBeNull();
  });
  it("delete is a no-op when no budget exists", async () => {
    await deleteMonthlyBudget(db, { year: 2026, month: 5 });
    expect(await getMonthlyBudget(db, { year: 2026, month: 5 })).toBeNull();
  });
});
