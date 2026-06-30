import { sql, gt, and, eq, isNull } from "drizzle-orm";
import { categories, transactions, expenseItems, monthlyBudgets } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import type { SyncChanges } from "@/lib/sync/types";
import type { LocalMonthlyBudget } from "@/lib/local/types";

const TABLES = { categories, transactions, expenseItems, monthlyBudgets } as const;
type TableKey = keyof typeof TABLES;

// Apply every incoming row with last-write-wins on updated_at. Each row is isolated
// in its own try/catch so a single malformed/duplicate/edge row is ignored
// defensively instead of aborting the whole batch (and, via the route, the pull).
export async function applyChanges(db: DB, changes: SyncChanges): Promise<void> {
  for (const key of Object.keys(TABLES) as TableKey[]) {
    const table = TABLES[key];
    for (const row of changes[key]) {
      try {
        if (key === "monthlyBudgets") {
          await applyBudgetRow(db, row as LocalMonthlyBudget);
        } else {
          await upsertRow(db, table, row);
        }
      } catch {
        // Skip the offending row and keep applying the rest.
        continue;
      }
    }
  }
}

// Generic LWW upsert keyed on the primary id: write only when the row is new or the
// incoming row is at least as fresh as what we have.
async function upsertRow(db: DB, table: (typeof TABLES)[TableKey], row: SyncChanges[TableKey][number]): Promise<void> {
  const updatedAt = new Date(row.updatedAt);
  const values = {
    ...row,
    updatedAt,
    deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
    createdAt: "createdAt" in row && row.createdAt ? new Date(row.createdAt as string) : new Date(),
  };
  await db
    .insert(table)
    .values(values as never)
    .onConflictDoUpdate({
      target: table.id,
      set: values as never,
      setWhere: sql`${table.updatedAt} <= ${updatedAt.toISOString()}`,
    });
}

// Budgets carry a partial unique index `(year,month) WHERE deleted_at IS NULL`, so a
// blind upsert keyed only on `id` can hit a unique violation when two devices create a
// budget for the same month with different uuids. Reconcile by (year,month) in
// application code: keep the newer active row (LWW) and tombstone the loser so only one
// active row per (year,month) ever exists — the partial index can never be violated.
async function applyBudgetRow(db: DB, row: LocalMonthlyBudget): Promise<void> {
  const updatedAt = new Date(row.updatedAt);
  const deletedAt = row.deletedAt ? new Date(row.deletedAt) : null;

  // An incoming tombstone is never in the active index — plain LWW upsert by id.
  if (deletedAt) {
    await upsertBudget(db, row, updatedAt, deletedAt);
    return;
  }

  // Incoming is a LIVE budget. Find the existing ACTIVE row for this (year, month).
  const [active] = await db
    .select()
    .from(monthlyBudgets)
    .where(
      and(
        eq(monthlyBudgets.year, row.year),
        eq(monthlyBudgets.month, row.month),
        isNull(monthlyBudgets.deletedAt),
      ),
    )
    .limit(1);

  // No conflicting active row, or it is the same id → normal LWW upsert by id.
  if (!active || active.id === row.id) {
    await upsertBudget(db, row, updatedAt, null);
    return;
  }

  // A different active row exists for this (year, month). LWW-reconcile.
  if (updatedAt.getTime() >= active.updatedAt.getTime()) {
    // Incoming wins: free the active slot by tombstoning the existing row, then write
    // the incoming row as the (now sole) active budget for the month.
    await db
      .update(monthlyBudgets)
      .set({ deletedAt: updatedAt, updatedAt })
      .where(eq(monthlyBudgets.id, active.id));
    await upsertBudget(db, row, updatedAt, null);
  } else {
    // Incoming loses: still persist it (for completeness) but as a self-tombstone so
    // the existing active row stays the unique active budget for the month.
    await upsertBudget(db, row, updatedAt, updatedAt);
  }
}

// LWW upsert for a single budget row with an explicit deletedAt outcome. createdAt is
// only supplied on insert and deliberately left out of the update set so a budget's
// created_at is never overwritten with now() on later updates.
async function upsertBudget(
  db: DB,
  row: LocalMonthlyBudget,
  updatedAt: Date,
  deletedAt: Date | null,
): Promise<void> {
  const set = { year: row.year, month: row.month, amount: row.amount, updatedAt, deletedAt };
  await db
    .insert(monthlyBudgets)
    .values({ id: row.id, ...set, createdAt: new Date() } as never)
    .onConflictDoUpdate({
      target: monthlyBudgets.id,
      set: set as never,
      setWhere: sql`${monthlyBudgets.updatedAt} <= ${updatedAt.toISOString()}`,
    });
}

// All rows changed strictly after `since` (ISO), across the four tables, mapped to
// ISO-string rows ready to merge into Dexie.
export async function fetchChangedSince(db: DB, since: string): Promise<SyncChanges> {
  const cutoff = new Date(since);
  const out: SyncChanges = { categories: [], transactions: [], expenseItems: [], monthlyBudgets: [] };
  for (const key of Object.keys(TABLES) as TableKey[]) {
    const table = TABLES[key];
    const rows = await db.select().from(table).where(gt(table.updatedAt, cutoff));
    out[key] = rows.map(toIso) as never;
  }
  return out;
}

function toIso<T extends { updatedAt: Date; deletedAt: Date | null; createdAt?: Date }>(r: T) {
  return {
    ...r,
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
    ...(r.createdAt ? { createdAt: r.createdAt.toISOString() } : {}),
  };
}
