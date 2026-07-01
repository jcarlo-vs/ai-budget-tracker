import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { applyChanges, fetchChangedSince } from "@/lib/server/sync";
import type { DB } from "@/lib/db/types";
import type { SyncChanges } from "@/lib/sync/types";
import type { LocalCategory } from "@/lib/local/types";

let db: DB;
beforeEach(async () => {
  db = await createTestDb();
});

const EPOCH = "1970-01-01T00:00:00.000Z";

function empty(): SyncChanges {
  return { categories: [], transactions: [], expenseItems: [], monthlyBudgets: [] };
}

function cat(over: Partial<LocalCategory> & Pick<LocalCategory, "id" | "updatedAt">): LocalCategory {
  return {
    name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0, sortOrder: 0, archived: false,
    scopeYear: null, scopeMonth: null, createdAt: over.updatedAt, deletedAt: null, ...over,
  };
}

describe("server sync ops (last-write-wins)", () => {
  it("inserts new rows on push and returns them on pull", async () => {
    await applyChanges(db, { ...empty(), categories: [cat({ id: "a", updatedAt: "2026-06-01T00:00:00.000Z", name: "Food" })] });
    const pulled = await fetchChangedSince(db, EPOCH);
    expect(pulled.categories).toHaveLength(1);
    expect(pulled.categories[0].name).toBe("Food");
    expect(typeof pulled.categories[0].updatedAt).toBe("string");
  });

  it("newer incoming wins, older incoming is ignored", async () => {
    await applyChanges(db, { ...empty(), categories: [cat({ id: "a", updatedAt: "2026-06-01T00:00:00.000Z", name: "Old" })] });
    // older write — must be ignored
    await applyChanges(db, { ...empty(), categories: [cat({ id: "a", updatedAt: "2026-05-01T00:00:00.000Z", name: "Stale" })] });
    let pulled = await fetchChangedSince(db, EPOCH);
    expect(pulled.categories[0].name).toBe("Old");
    // newer write — must win
    await applyChanges(db, { ...empty(), categories: [cat({ id: "a", updatedAt: "2026-07-01T00:00:00.000Z", name: "Fresh" })] });
    pulled = await fetchChangedSince(db, EPOCH);
    expect(pulled.categories[0].name).toBe("Fresh");
  });

  it("round-trips a category's scopeYear/scopeMonth (temporary) and null scope (permanent)", async () => {
    await applyChanges(db, {
      ...empty(),
      categories: [
        cat({ id: "temp", updatedAt: "2026-07-01T00:00:00.000Z", name: "Vacation", scopeYear: 2026, scopeMonth: 7 }),
        cat({ id: "perm", updatedAt: "2026-07-01T00:00:00.000Z", name: "Rent" }),
      ],
    });
    const pulled = await fetchChangedSince(db, EPOCH);
    const temp = pulled.categories.find((c) => c.id === "temp")!;
    const perm = pulled.categories.find((c) => c.id === "perm")!;
    expect(temp.scopeYear).toBe(2026);
    expect(temp.scopeMonth).toBe(7);
    expect(perm.scopeYear).toBeNull();
    expect(perm.scopeMonth).toBeNull();

    // A later update to the scope also propagates via LWW.
    await applyChanges(db, {
      ...empty(),
      categories: [cat({ id: "temp", updatedAt: "2026-07-02T00:00:00.000Z", name: "Vacation", scopeYear: 2026, scopeMonth: 8 })],
    });
    const after = (await fetchChangedSince(db, EPOCH)).categories.find((c) => c.id === "temp")!;
    expect(after.scopeMonth).toBe(8);
  });

  it("tombstone propagates as a soft delete", async () => {
    await applyChanges(db, { ...empty(), categories: [cat({ id: "a", updatedAt: "2026-06-01T00:00:00.000Z" })] });
    await applyChanges(db, {
      ...empty(),
      categories: [cat({ id: "a", updatedAt: "2026-06-02T00:00:00.000Z", deletedAt: "2026-06-02T00:00:00.000Z" })],
    });
    const pulled = await fetchChangedSince(db, EPOCH);
    expect(pulled.categories[0].deletedAt).toBe("2026-06-02T00:00:00.000Z");
  });

  it("pull only returns rows changed after `since`", async () => {
    await applyChanges(db, { ...empty(), categories: [cat({ id: "old", updatedAt: "2026-06-01T00:00:00.000Z" })] });
    await applyChanges(db, { ...empty(), categories: [cat({ id: "new", updatedAt: "2026-06-10T00:00:00.000Z" })] });
    const pulled = await fetchChangedSince(db, "2026-06-05T00:00:00.000Z");
    expect(pulled.categories.map((c) => c.id)).toEqual(["new"]);
  });

  it("reconciles two devices' budgets for the same (year,month) via LWW without a unique violation", async () => {
    // Device A sets June's budget (older).
    await applyChanges(db, {
      ...empty(),
      monthlyBudgets: [{ id: "bA", year: 2026, month: 6, amount: 1000000, updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null }],
    });
    // Device B (offline) set June's budget with a DIFFERENT uuid and a NEWER stamp.
    // The partial unique index (year,month) WHERE deleted_at IS NULL must NOT be violated.
    await expect(
      applyChanges(db, {
        ...empty(),
        monthlyBudgets: [{ id: "bB", year: 2026, month: 6, amount: 2000000, updatedAt: "2026-06-02T00:00:00.000Z", deletedAt: null }],
      }),
    ).resolves.toBeUndefined();

    const pulled = await fetchChangedSince(db, EPOCH);
    const active = pulled.monthlyBudgets.filter((b) => b.deletedAt == null);
    expect(active).toHaveLength(1); // exactly one active budget for the month
    expect(active[0].id).toBe("bB"); // newer wins
    expect(active[0].amount).toBe(2000000);
    const loser = pulled.monthlyBudgets.find((b) => b.id === "bA");
    expect(loser?.deletedAt).not.toBeNull(); // loser tombstoned
  });

  it("an older second-device budget loses and is tombstoned; the active one is preserved", async () => {
    await applyChanges(db, {
      ...empty(),
      monthlyBudgets: [{ id: "bNew", year: 2026, month: 7, amount: 3000000, updatedAt: "2026-06-10T00:00:00.000Z", deletedAt: null }],
    });
    await expect(
      applyChanges(db, {
        ...empty(),
        monthlyBudgets: [{ id: "bOld", year: 2026, month: 7, amount: 5000, updatedAt: "2026-06-05T00:00:00.000Z", deletedAt: null }],
      }),
    ).resolves.toBeUndefined();

    const pulled = await fetchChangedSince(db, EPOCH);
    const active = pulled.monthlyBudgets.filter((b) => b.year === 2026 && b.month === 7 && b.deletedAt == null);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("bNew");
    expect(pulled.monthlyBudgets.find((b) => b.id === "bOld")?.deletedAt).not.toBeNull();
  });

  it("two live budgets for the same month in one batch never violate the unique index", async () => {
    await expect(
      applyChanges(db, {
        ...empty(),
        monthlyBudgets: [
          { id: "b1", year: 2026, month: 9, amount: 100, updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null },
          { id: "b2", year: 2026, month: 9, amount: 200, updatedAt: "2026-06-02T00:00:00.000Z", deletedAt: null },
        ],
      }),
    ).resolves.toBeUndefined();
    const active = (await fetchChangedSince(db, EPOCH)).monthlyBudgets.filter((b) => b.month === 9 && b.deletedAt == null);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("b2");
  });

  it("preserves a budget's created_at across updates (no drift to now())", async () => {
    await applyChanges(db, {
      ...empty(),
      monthlyBudgets: [{ id: "bX", year: 2026, month: 8, amount: 1, updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null }],
    });
    const created1 = (await fetchChangedSince(db, EPOCH)).monthlyBudgets.find((b) => b.id === "bX") as unknown as { createdAt: string };
    await applyChanges(db, {
      ...empty(),
      monthlyBudgets: [{ id: "bX", year: 2026, month: 8, amount: 999, updatedAt: "2026-06-02T00:00:00.000Z", deletedAt: null }],
    });
    const after = (await fetchChangedSince(db, EPOCH)).monthlyBudgets.find((b) => b.id === "bX") as unknown as { amount: number; createdAt: string };
    expect(after.amount).toBe(999);
    expect(after.createdAt).toBe(created1.createdAt);
  });

  it("skips a malformed row but still applies the rest of the batch", async () => {
    // A transaction with a non-existent category fk would throw; it must be skipped,
    // and the valid category in the same batch must still be applied.
    await expect(
      applyChanges(db, {
        ...empty(),
        categories: [cat({ id: "ok", updatedAt: "2026-06-01T00:00:00.000Z", name: "Kept" })],
        transactions: [{
          id: "bad", categoryId: "does-not-exist", amount: 1, description: "", occurredOn: "2026-06-01",
          paymentMethod: "cash", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null,
        }],
      }),
    ).resolves.toBeUndefined();
    const pulled = await fetchChangedSince(db, EPOCH);
    expect(pulled.categories.map((c) => c.id)).toContain("ok");
    expect(pulled.transactions.map((t) => t.id)).not.toContain("bad");
  });

  it("round-trips transactions, items and budgets with their fks", async () => {
    const changes: SyncChanges = {
      categories: [cat({ id: "c1", updatedAt: "2026-06-01T00:00:00.000Z" })],
      transactions: [{
        id: "t1", categoryId: "c1", amount: 5000, description: "Lunch", occurredOn: "2026-06-10",
        paymentMethod: "cash", createdAt: "2026-06-10T00:00:00.000Z", updatedAt: "2026-06-10T00:00:00.000Z", deletedAt: null,
      }],
      expenseItems: [{
        id: "i1", transactionId: "t1", name: "Rice", amount: 5000,
        createdAt: "2026-06-10T00:00:00.000Z", updatedAt: "2026-06-10T00:00:00.000Z", deletedAt: null,
      }],
      monthlyBudgets: [{
        id: "b1", year: 2026, month: 6, amount: 1000000,
        updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null,
      }],
    };
    await applyChanges(db, changes);
    const pulled = await fetchChangedSince(db, EPOCH);
    expect(pulled.transactions[0]).toMatchObject({ id: "t1", categoryId: "c1", amount: 5000, occurredOn: "2026-06-10" });
    expect(pulled.expenseItems[0]).toMatchObject({ id: "i1", transactionId: "t1", amount: 5000 });
    expect(pulled.monthlyBudgets[0]).toMatchObject({ id: "b1", year: 2026, month: 6, amount: 1000000 });
  });
});
