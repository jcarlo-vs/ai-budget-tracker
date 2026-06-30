# Offline Mode Implementation Plan (Stage 1 + Stage 2 outline)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the budget tracker offline-first — IndexedDB on the device is the source of truth (instant, works with no signal), syncing two-way with Neon via last-write-wins when online.

**Architecture:** Dexie (IndexedDB) mirrors the 4 tables and backs all reads/writes in client-rendered pages. A `/api/sync` route does push/pull with last-write-wins (`updatedAt` newest wins; soft-delete tombstones). UUID primary keys (client-generated) make offline creation collision-free. A Serwist service worker caches the shell; a client `LockGate` enforces the passcode offline.

**Tech Stack:** Next.js 16 App Router, Drizzle + Neon (server) / PGlite (tests), **Dexie + dexie-react-hooks** (local DB + reactive reads), **@serwist/next** (service worker), Zod, Vitest + **fake-indexeddb**.

## Global Constraints

- PHP, integer **centavos**; format only at display via `formatCentavos`.
- **Primary keys are UUID text** (`crypto.randomUUID()`), generated on the device; ids are `string` everywhere (was `number`).
- Every table has **`updatedAt`** (set on every write) and **`deletedAt`** (nullable tombstone). UI reads filter `deletedAt == null`.
- **Last-write-wins:** on merge, write incoming iff it doesn't exist or `incoming.updatedAt >= existing.updatedAt`.
- Local DB (Dexie) is the **source of truth** for the UI; the network is never in the read/write path. Sync is background, non-blocking.
- TypeScript strict; no `any` except the documented Drizzle `PgDatabase<any, typeof schema>` type.
- Apple Liquid Glass dark theme; reference tokens; inputs ≥16px; mobile-first.
- Tests: `npx vitest run`. Component test files start with `// @vitest-environment jsdom`. Dexie tests import `fake-indexeddb/auto`.
- **No git commits / no `db:migrate` / no `npm run build`** performed by subagents — the controller runs the coordinated migrate + deploy at the end (see Task 12). Each task ends with `npx tsc --noEmit` clean + its tests green.
- Spec: `docs/superpowers/specs/2026-06-30-offline-mode-design.md` (read it; it is the source of truth for behavior).

## Pre-flight (controller, before Task 1)
- **Back up Neon** (Neon console → create a branch / note a restore point) before the Task 1 migration is ever applied to production.

---

## Task 1: Dependencies + Dexie local store + Serwist scaffolding

**Files:**
- Modify: `package.json` (deps)
- Create: `lib/local/db.ts`
- Create: `lib/local/types.ts`
- Modify: `next.config.ts`, `vitest.setup.ts`

**Interfaces:**
- Produces: `localDb` (Dexie instance) with tables `categories`, `transactions`, `expenseItems`, `monthlyBudgets`, `meta`; local row types `LocalCategory`, `LocalTransaction`, `LocalExpenseItem`, `LocalMonthlyBudget` (all with `id: string`, `updatedAt: string`, `deletedAt: string | null`).

- [ ] **Step 1: Install deps**
```bash
npm install dexie dexie-react-hooks @serwist/next serwist
npm install -D fake-indexeddb
```

- [ ] **Step 2: Local row types** `lib/local/types.ts`
```ts
export interface LocalCategory {
  id: string; name: string; emoji: string; color: string;
  monthlyBudget: number; sortOrder: number; archived: boolean;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface LocalTransaction {
  id: string; categoryId: string; amount: number; description: string;
  occurredOn: string; paymentMethod: string;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface LocalExpenseItem {
  id: string; transactionId: string; name: string; amount: number;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface LocalMonthlyBudget {
  id: string; year: number; month: number; amount: number;
  updatedAt: string; deletedAt: string | null;
}
export type SyncTable = "categories" | "transactions" | "expenseItems" | "monthlyBudgets";
```

- [ ] **Step 3: Dexie store** `lib/local/db.ts`
```ts
import Dexie, { type Table } from "dexie";
import type {
  LocalCategory, LocalTransaction, LocalExpenseItem, LocalMonthlyBudget,
} from "@/lib/local/types";

export interface MetaRow { key: string; value: string }

class BudgetDB extends Dexie {
  categories!: Table<LocalCategory, string>;
  transactions!: Table<LocalTransaction, string>;
  expenseItems!: Table<LocalExpenseItem, string>;
  monthlyBudgets!: Table<LocalMonthlyBudget, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("budget-tracker");
    this.version(1).stores({
      categories: "id, sortOrder, updatedAt, deletedAt",
      transactions: "id, categoryId, occurredOn, updatedAt, deletedAt",
      expenseItems: "id, transactionId, updatedAt, deletedAt",
      monthlyBudgets: "id, [year+month], updatedAt, deletedAt",
      meta: "key",
    });
  }
}

export const localDb = typeof indexedDB !== "undefined" ? new BudgetDB() : (undefined as unknown as BudgetDB);

export async function getMeta(key: string): Promise<string | undefined> {
  return (await localDb.meta.get(key))?.value;
}
export async function setMeta(key: string, value: string): Promise<void> {
  await localDb.meta.put({ key, value });
}
```

- [ ] **Step 4: vitest setup for Dexie** — append to `vitest.setup.ts`:
```ts
import "fake-indexeddb/auto";
```

- [ ] **Step 5: Serwist scaffold in `next.config.ts`** (wrap the export; the SW source is added in Task 8):
```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.112"],
};

export default withSerwist(nextConfig);
```
(Keep the existing `allowedDevOrigins`.)

- [ ] **Step 6:** `npx tsc --noEmit` clean. (`app/sw.ts` is created in Task 8; until then keep `disable` true in dev so the build/dev don't require it — Task 8 adds the file.)

---

## Task 2: Schema → UUID + updatedAt + deletedAt + data-preserving migration

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/0004_offline_uuid.sql` (HAND-WRITTEN — drizzle-kit's auto-diff would drop data)
- Modify: `drizzle/meta/_journal.json` (append the 0004 entry) — or run `db:generate --custom` then replace its body
- Modify: `lib/schemas.ts` (id zod → uuid; see Task 3 usage)

**Interfaces:**
- Produces: Drizzle tables with `id: text` PKs, uuid FKs, `updatedAt`/`deletedAt` columns; types `Category/Transaction/ExpenseItem/MonthlyBudget` now have `id: string` etc.

- [ ] **Step 1: Rewrite `lib/db/schema.ts`** with uuid + audit columns:
```ts
import { pgTable, text, integer, boolean, timestamp, date, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("📦"),
  color: text("color").notNull().default("#0a84ff"),
  monthlyBudget: integer("monthly_budget").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  ...audit,
});

export const transactions = pgTable("transactions", {
  id: id(),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description").notNull().default(""),
  occurredOn: date("occurred_on").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  ...audit,
});

export const expenseItems = pgTable("expense_items", {
  id: id(),
  transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  ...audit,
});

export const monthlyBudgets = pgTable("monthly_budgets", {
  id: id(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: integer("amount").notNull(),
  ...audit,
}, (t) => [uniqueIndex("monthly_budgets_year_month_active").on(t.year, t.month).where(sql`${t.deletedAt} is null`)]);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type ExpenseItem = typeof expenseItems.$inferSelect;
export type NewExpenseItem = typeof expenseItems.$inferInsert;
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudgets.$inferInsert;
```
Note: `monthly_budgets` drops `createdAt`? Keep `...audit` (adds created_at too — harmless). Existing budgets had no created_at; migration backfills it.

- [ ] **Step 2: Write the data-preserving migration** `drizzle/0004_offline_uuid.sql`. It converts int PKs → uuid, repoints FKs, adds audit columns, and swaps the budgets unique constraint for a partial index. Works on both a populated DB (Neon) and an empty one (PGlite test):
```sql
-- categories: add uuid id + audit
ALTER TABLE "categories" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "categories" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
-- transactions: add uuid id + uuid fk + audit
ALTER TABLE "transactions" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "category_id_uuid" text;
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;
UPDATE "transactions" t SET "category_id_uuid" = c."id_uuid" FROM "categories" c WHERE t."category_id" = c."id";
--> statement-breakpoint
-- expense_items: add uuid id + uuid fk + audit
ALTER TABLE "expense_items" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "expense_items" ADD COLUMN "transaction_id_uuid" text;
ALTER TABLE "expense_items" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "expense_items" ADD COLUMN "deleted_at" timestamp with time zone;
UPDATE "expense_items" e SET "transaction_id_uuid" = t."id_uuid" FROM "transactions" t WHERE e."transaction_id" = t."id";
--> statement-breakpoint
-- monthly_budgets: add uuid id + audit
ALTER TABLE "monthly_budgets" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "monthly_budgets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "monthly_budgets" ADD COLUMN "deleted_at" timestamp with time zone;
ALTER TABLE "monthly_budgets" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
-- drop old FKs + PKs, swap columns
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_categories_id_fk";
ALTER TABLE "expense_items" DROP CONSTRAINT IF EXISTS "expense_items_transaction_id_transactions_id_fk";
ALTER TABLE "monthly_budgets" DROP CONSTRAINT IF EXISTS "monthly_budgets_year_month_unique";
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey";
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pkey";
ALTER TABLE "expense_items" DROP CONSTRAINT "expense_items_pkey";
ALTER TABLE "monthly_budgets" DROP CONSTRAINT "monthly_budgets_pkey";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "id"; ALTER TABLE "categories" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "transactions" DROP COLUMN "id"; ALTER TABLE "transactions" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "transactions" DROP COLUMN "category_id"; ALTER TABLE "transactions" RENAME COLUMN "category_id_uuid" TO "category_id";
ALTER TABLE "expense_items" DROP COLUMN "id"; ALTER TABLE "expense_items" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "expense_items" DROP COLUMN "transaction_id"; ALTER TABLE "expense_items" RENAME COLUMN "transaction_id_uuid" TO "transaction_id";
ALTER TABLE "monthly_budgets" DROP COLUMN "id"; ALTER TABLE "monthly_budgets" RENAME COLUMN "id_uuid" TO "id";
--> statement-breakpoint
-- re-add PKs, FKs, partial unique index, NOT NULLs
ALTER TABLE "categories" ADD PRIMARY KEY ("id");
ALTER TABLE "transactions" ADD PRIMARY KEY ("id");
ALTER TABLE "transactions" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE cascade;
ALTER TABLE "expense_items" ADD PRIMARY KEY ("id");
ALTER TABLE "expense_items" ALTER COLUMN "transaction_id" SET NOT NULL;
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE cascade;
ALTER TABLE "monthly_budgets" ADD PRIMARY KEY ("id");
CREATE UNIQUE INDEX "monthly_budgets_year_month_active" ON "monthly_budgets" ("year","month") WHERE "deleted_at" is null;
```
Register it: run `npm run db:generate -- --name offline_uuid --custom` to create a stub + journal entry, then replace the stub file's body with the SQL above (keeping its generated filename). Confirm the `drizzle/meta/_journal.json` lists it last.

- [ ] **Step 3: Verify the migration on a fresh PGlite DB** (this is what the test helper uses) — add a temporary check or rely on Task 5 tests (they call `createTestDb()` which runs all migrations). Run `npx vitest run lib/__tests__/db.test.ts` → it should still create the schema (now uuid). If `db.test.ts` asserts int ids, update it to expect string ids.

- [ ] **Step 4:** Update `lib/schemas.ts` id-bearing schemas — see Task 3 (the action/sync validation). For now ensure `npx tsc --noEmit` passes for the schema file.

> Server data-access files (`lib/data/*`) and server actions (`app/actions/*`) will not compile until Tasks 3/9/10 update them. That's expected; this task's gate is the schema + migration compiling in isolation and the migration applying on a fresh PGlite DB. Run the full `tsc` at the end of Task 3.

---

## Task 3: Server sync ops + `/api/sync` route

**Files:**
- Create: `lib/server/sync.ts`
- Create: `app/api/sync/route.ts`
- Create: `lib/sync/types.ts`
- Modify: `lib/schemas.ts` (sync payload validation)
- Modify: `proxy.ts` (protect `/api/sync`; stop gating page routes — auth is now client-side)

**Interfaces:**
- Produces: `POST /api/sync` accepting `{ since: string; changes: SyncChanges }` → `{ rows: SyncChanges; now: string }`; `SyncChanges = { categories: Local*[]; transactions: Local*[]; expenseItems: Local*[]; monthlyBudgets: Local*[] }`.

- [ ] **Step 1: Sync types** `lib/sync/types.ts`
```ts
import type { LocalCategory, LocalTransaction, LocalExpenseItem, LocalMonthlyBudget } from "@/lib/local/types";
export interface SyncChanges {
  categories: LocalCategory[];
  transactions: LocalTransaction[];
  expenseItems: LocalExpenseItem[];
  monthlyBudgets: LocalMonthlyBudget[];
}
export interface SyncРequestBody { since: string; changes: SyncChanges }
export interface SyncResponse { rows: SyncChanges; now: string }
```
(Use ASCII `SyncRequestBody`.)

- [ ] **Step 2: Server sync ops** `lib/server/sync.ts` — LWW upsert + fetch-changed-since, per table, against Neon. Map DB rows (Date `updatedAt`) to ISO strings. Pseudocode-complete:
```ts
import { sql, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, transactions, expenseItems, monthlyBudgets } from "@/lib/db/schema";
import type { SyncChanges } from "@/lib/sync/types";

const TABLES = { categories, transactions, expenseItems, monthlyBudgets } as const;

// Upsert each incoming row with last-write-wins on updated_at.
export async function applyChanges(changes: SyncChanges): Promise<void> {
  for (const key of Object.keys(TABLES) as (keyof typeof TABLES)[]) {
    const table = TABLES[key];
    for (const row of changes[key]) {
      // normalize ISO strings → Date for timestamptz columns
      const values = { ...row, updatedAt: new Date(row.updatedAt),
        deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
        createdAt: "createdAt" in row && row.createdAt ? new Date(row.createdAt) : new Date() };
      await db.insert(table).values(values as never)
        .onConflictDoUpdate({
          target: table.id,
          set: values as never,
          setWhere: sql`${table.updatedAt} <= ${values.updatedAt.toISOString()}`,
        });
    }
  }
}

// All rows changed after `since` (ISO), across tables, as ISO-string rows.
export async function fetchChangedSince(since: string): Promise<SyncChanges> {
  const cutoff = new Date(since);
  const out: SyncChanges = { categories: [], transactions: [], expenseItems: [], monthlyBudgets: [] };
  for (const key of Object.keys(TABLES) as (keyof typeof TABLES)[]) {
    const table = TABLES[key];
    const rows = await db.select().from(table).where(gt(table.updatedAt, cutoff));
    out[key] = rows.map(toIso) as never;
  }
  return out;
}

function toIso<T extends { updatedAt: Date; deletedAt: Date | null; createdAt?: Date }>(r: T) {
  return { ...r, updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
    ...(r.createdAt ? { createdAt: r.createdAt.toISOString() } : {}) };
}
```
(`onConflictDoUpdate` with `setWhere` for LWW is supported by drizzle/neon-http. `inArray` import unused → drop.)

- [ ] **Step 3: The route** `app/api/sync/route.ts`
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { applyChanges, fetchChangedSince } from "@/lib/server/sync";
import { syncBodySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token, process.env.AUTH_SECRET!))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = syncBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await applyChanges(parsed.data.changes);
  const rows = await fetchChangedSince(parsed.data.since);
  return NextResponse.json({ rows, now: new Date().toISOString() });
}
```

- [ ] **Step 4: Zod for the body** — add to `lib/schemas.ts` `syncBodySchema` validating `{ since: string, changes: {<table>: array of row objects} }`. Rows validated leniently (id string, updatedAt string, deletedAt string|null, plus fields). Keep `categorySchema`/`expenseSchema`/`budgetSchema`/`itemSchema` for input validation but change id-typed fields to `z.string()`.

- [ ] **Step 5: `proxy.ts`** — protect `/api/sync` (require session), and **remove page-route gating** (pages are now client-gated by `LockGate`); keep `/login` and static public. Confirm `/api/sync` returns 401 without a session.

- [ ] **Step 6:** `npx tsc --noEmit` clean across the repo now (server data layer used only by sync + bootstrap; the old `lib/data/*` CRUD will be superseded in Tasks 9–10 — if anything fails to compile, it's because a page still imports the old server action; that's handled in Tasks 9–10, so temporarily it's acceptable for THIS task's gate to compile `lib/server/sync.ts`, the route, and schemas. Run a full `tsc` after Task 10.)

---

## Task 4: Last-write-wins merge (pure, TDD)

**Files:**
- Create: `lib/sync/merge.ts`
- Test: `lib/__tests__/merge.test.ts`

**Interfaces:**
- Produces: `mergeRow<T extends Syncable>(existing: T | undefined, incoming: T): T` — returns the row that should be stored (LWW), and `pickNewer` helper.

- [ ] **Step 1: Failing test** `lib/__tests__/merge.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { mergeRow } from "@/lib/sync/merge";
const base = { id: "a", updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null as string | null };

describe("mergeRow (last-write-wins)", () => {
  it("inserts when nothing exists", () => {
    expect(mergeRow(undefined, base)).toEqual(base);
  });
  it("incoming newer wins", () => {
    const inc = { ...base, updatedAt: "2026-06-02T00:00:00.000Z" };
    expect(mergeRow(base, inc)).toEqual(inc);
  });
  it("incoming older is ignored", () => {
    const inc = { ...base, updatedAt: "2026-05-01T00:00:00.000Z" };
    expect(mergeRow(base, inc)).toEqual(base);
  });
  it("tombstone (newer) wins", () => {
    const inc = { ...base, updatedAt: "2026-06-03T00:00:00.000Z", deletedAt: "2026-06-03T00:00:00.000Z" };
    expect(mergeRow(base, inc)).toEqual(inc);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `lib/sync/merge.ts`
```ts
export interface Syncable { id: string; updatedAt: string; deletedAt: string | null }
export function mergeRow<T extends Syncable>(existing: T | undefined, incoming: T): T {
  if (!existing) return incoming;
  return incoming.updatedAt >= existing.updatedAt ? incoming : existing;
}
```
- [ ] **Step 4:** Run → PASS. `npx tsc --noEmit` clean.

---

## Task 5: Client data layer (Dexie) + tests

**Files:**
- Create: `lib/local/data/categories.ts`, `transactions.ts`, `budgets.ts`, `overview.ts`, `savings.ts`
- Test: `lib/__tests__/local-data.test.ts`

**Interfaces:**
- Produces (all async, against `localDb`, all set `updatedAt = new Date().toISOString()`, generate ids with `crypto.randomUUID()`, filter `deletedAt == null` on reads):
  - categories: `listCategories()`, `createCategory(input)`, `updateCategory(id, input)`, `deleteCategory(id)` (tombstone)
  - transactions: `listTransactions({categoryId, ym})`, `addExpense(input, items?)`, `updateExpense(id, input, items?)`, `deleteExpense(id)` (tombstone + tombstone its items), `getItemsByTransaction(ids)`
  - budgets: `getMonthlyBudget(ym)`, `setMonthlyBudget(ym, amount)` (upsert by year+month), `getRecentBudgetBefore(ym)`, `deleteMonthlyBudget(ym)`
  - overview: `getCategoriesWithMonthTotals(ym)`
  - savings: `getSavings(currentYm)`
  - These mirror the EXACT return shapes the components already consume (so components barely change). Reuse `monthRange`, `monthKey` from `lib/month`.

- [ ] **Step 1: Failing tests** `lib/__tests__/local-data.test.ts` (`// @vitest-environment jsdom` + `import "fake-indexeddb/auto"`). Cover: create+list category; add expense with items sets amount=sum & items retrievable; soft-delete hides from list; budget upsert by (year,month); savings sums past budgeted months (port the existing savings tests against the local layer). Clear `localDb` tables in `beforeEach`.
- [ ] **Step 2:** Run → FAIL (modules missing).
- [ ] **Step 3: Implement** the five files. Each mutation: `const now = new Date().toISOString()`. Examples:
```ts
// lib/local/data/categories.ts
import { localDb } from "@/lib/local/db";
import type { LocalCategory } from "@/lib/local/types";
import type { CategoryInput } from "@/lib/schemas";

export async function listCategories(): Promise<LocalCategory[]> {
  return (await localDb.categories.where("deletedAt").equals("").or("deletedAt").equals(null as never).toArray())
    .filter((c) => c.deletedAt == null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
export async function createCategory(input: CategoryInput): Promise<LocalCategory> {
  const now = new Date().toISOString();
  const row: LocalCategory = { id: crypto.randomUUID(), sortOrder: 0, archived: false,
    createdAt: now, updatedAt: now, deletedAt: null, ...input };
  await localDb.categories.put(row);
  return row;
}
export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  await localDb.categories.update(id, { ...input, updatedAt: new Date().toISOString() });
}
export async function deleteCategory(id: string): Promise<void> {
  await localDb.categories.update(id, { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}
```
(Implement transactions/budgets/overview/savings analogously; `addExpense` sets `amount = sum(items)` when items given and writes item rows; `getSavings`/`getCategoriesWithMonthTotals` reproduce the existing logic over Dexie reads. Filter tombstones everywhere. For Dexie "deletedAt is null" prefer reading all then `.filter(r => r.deletedAt == null)` for clarity.)
- [ ] **Step 4:** Run → PASS. `npx tsc --noEmit` clean.

---

## Task 6: Sync client + bootstrap

**Files:**
- Create: `lib/sync/client.ts`
- Create: `lib/local/bootstrap.ts`
- Create: `components/sync-provider.tsx`

**Interfaces:**
- Produces: `syncNow(): Promise<void>` (collect local changes since `lastSyncAt` → POST `/api/sync` → merge response via `mergeRow` into Dexie → set `lastSyncAt = now`); `<SyncProvider/>` client component that runs `syncNow` on mount, after a custom `local-mutation` event (debounced), and on `online`; `bootstrapIfEmpty()`.

- [ ] **Step 1: `lib/sync/client.ts`** — collect changed rows per table (`updatedAt > lastSyncAt`, default `"1970-..."`), POST, merge with `mergeRow`, update meta. Guard: skip if `!navigator.onLine`. Catch+swallow errors. Export a `requestSync()` that debounces.
- [ ] **Step 2: `lib/local/bootstrap.ts`** — `bootstrapIfEmpty()`: if `categories` table empty and online, call `syncNow()` (since=epoch pulls everything).
- [ ] **Step 3: `components/sync-provider.tsx`** (`"use client"`): on mount `await bootstrapIfEmpty(); syncNow()`; `window.addEventListener("online", syncNow)`; listen for `local-mutation` events (dispatched by the client data layer after writes) and debounce `syncNow`. Render `{children}`.
- [ ] **Step 4:** Have the client data layer (Task 5) dispatch `window.dispatchEvent(new Event("local-mutation"))` after each mutation (add a tiny `touch()` helper used by all mutations).
- [ ] **Step 5:** `npx tsc --noEmit` clean. (Sync is exercised end-to-end in Task 12 manual verification; a light unit test of `collectChanges` filtering by `lastSyncAt` is encouraged.)

---

## Task 7: Offline lock (LockGate) + layout wiring

**Files:**
- Create: `components/lock-gate.tsx`, `lib/local/lock.ts`
- Modify: `app/layout.tsx`, `app/login/login-form.tsx`, `app/actions/auth.ts`

**Interfaces:**
- Produces: client `LockGate` that shows the passcode screen unless unlocked; `setUnlocked(passcode)` stores a SHA-256 hash + unlocked flag locally; `checkPasscode(passcode)` (offline) compares hashes.

- [ ] **Step 1: `lib/local/lock.ts`** — `hashPasscode(p)` via `crypto.subtle.digest("SHA-256", ...)`; `storeUnlock(p)` saves hash + `unlocked=1` in `meta`; `isUnlocked()`; `verifyOffline(p)` compares to stored hash; `lock()`.
- [ ] **Step 2: Online unlock** — `login-form.tsx` still calls the server `loginAction` when online (validates real passcode, sets the session cookie used by `/api/sync`); on success also call `storeUnlock(enteredPasscode)`. Offline, the form calls `verifyOffline`.
- [ ] **Step 3: `LockGate`** (`"use client"`) wraps the app: if `isUnlocked()` render children + `<SyncProvider>`; else render the lock screen (reuse the login UI). Replaces middleware gating.
- [ ] **Step 4: `app/layout.tsx`** — wrap `{children}` in `<LockGate>` (which renders `<SyncProvider>` inside). Keep Toaster, BottomNav.
- [ ] **Step 5:** `npx tsc --noEmit` clean.

---

## Task 8: Service worker (Serwist)

**Files:**
- Create: `app/sw.ts`
- Modify: `next.config.ts` (set `disable` false for prod — already wired in Task 1), `app/manifest.ts` (already standalone)

- [ ] **Step 1: `app/sw.ts`** — standard Serwist service worker with `defaultCache` (precache the build manifest, runtime-cache navigations with a NetworkFirst + offline fallback to "/"). Per `node_modules/@serwist/next` docs.
- [ ] **Step 2:** Ensure `swSrc: "app/sw.ts"` builds; the SW only activates in production builds (disabled in dev).
- [ ] **Step 3:** `npx tsc --noEmit` clean. (SW behavior is verified in the Task 12 deploy/airplane-mode check.)

---

## Task 9: Convert the Dashboard to client + Dexie (worked example for Tasks 10)

**Files:**
- Modify: `app/page.tsx`, `components/dashboard-client.tsx`, `components/expense-sheet.tsx`, `components/mark-paid-button.tsx`, `components/category-card.tsx`

**Interfaces:**
- Consumes: the Task 5 client data layer + `dexie-react-hooks` `useLiveQuery`.

- [ ] **Step 1:** Make `app/page.tsx` a client component (`"use client"`). Read the viewed month from `useSearchParams`. Use `useLiveQuery` to read `getCategoriesWithMonthTotals(ym)` + `getMonthlyBudget(ym)` from Dexie (reactive — updates instantly on local writes). Compute spent/allocated as before. Render the SAME gauge/strip/cards. Remove `ensureSeedCategories` (seeding handled by bootstrap or a first-run local seed).
- [ ] **Step 2:** Mark-paid + expense add now call the **client** data layer (Dexie) instead of server actions; `mark-paid-button.tsx` calls a local `markCategoryPaid(categoryId, ym)` (computes remaining from Dexie, adds a local expense). `expense-sheet.tsx` calls local `addExpense`/`updateExpense`. After writes, `useLiveQuery` re-renders automatically (no `router.refresh`).
- [ ] **Step 3:** `npx tsc --noEmit` clean; the dashboard renders from Dexie (verified via dev once SW disabled).

---

## Task 10: Convert remaining pages + components to client + Dexie

**Files:**
- Modify: `app/category/[id]/page.tsx`, `components/category-detail-client.tsx`, `components/transaction-row.tsx`, `app/savings/page.tsx`, `app/categories/page.tsx`, `components/category-manager.tsx`, `components/budget-form.tsx`

- [ ] **Step 1:** Apply the Task 9 pattern to each: `"use client"`, `useLiveQuery` for reads, client data-layer calls for writes (category CRUD, budget set/clear, expense edit/delete with items). Remove server-action imports from these flows. Keep all UI/behavior (itemize, Mark Paid, two-tap delete, savings math).
- [ ] **Step 2:** Delete or stop exporting now-unused server actions (`app/actions/*`) if nothing references them, EXCEPT `auth.ts` (login/logout) which stays. Remove the now-unused server `lib/data/*` CRUD if unreferenced (the sync route uses `lib/server/sync.ts`, not the old CRUD).
- [ ] **Step 3: Full repo `npx tsc --noEmit` clean + `npx vitest run` all green.** Update/move any remaining `*.data.test.ts` that referenced the old server CRUD to the new local layer (or delete if superseded by Task 5 tests). The pure tests (money, month, merge) stay.

---

## Task 11 (Stage 2): Sync status + manual sync + export backup

**Files:**
- Create: `components/sync-status.tsx`; Modify: bottom nav or a header to show it; add a "Sync now" + "Export backup (JSON)" in Manage.

- [ ] Sync-status chip (Synced ✓ / Syncing… / Offline) driven by sync state + `navigator.onLine`.
- [ ] "Sync now" button → `syncNow()`. "Export backup" → download a JSON of all Dexie tables.
- [ ] `tsc` clean + tests green.

---

## Task 12: Coordinated migration + deploy (controller)

**Files:** none (operational)

- [ ] **Step 1:** Confirm Neon backup/branch exists (pre-flight).
- [ ] **Step 2:** Apply the migration: `set -a; . ./.env.local; set +a; npm run db:migrate` (controller; prod-DB guard → user runs it).
- [ ] **Step 3:** Deploy the new code (same window): `npx vercel@latest --prod --yes`.
- [ ] **Step 4:** Verify on device: open online (bootstrap pulls data), add an expense in airplane mode (saves), re-enable wifi (auto-syncs), confirm it appears after reload + on the second phone. Confirm the app opens in airplane mode after a cold start.

---

## Self-Review

**Spec coverage:** local store (T1,T5), uuid+updatedAt+deletedAt schema+migration (T2), `/api/sync` push/pull LWW (T3), merge logic (T4), client data layer (T5), sync client+bootstrap+triggers (T6), offline lock (T7), service worker (T8), pages→client (T9,T10), sync-status/export (T11), coordinated migrate+deploy + backup (pre-flight, T12). All spec sections mapped.

**Placeholder scan:** Foundational tasks (1–8) carry complete code; the page conversions (9–10) give the exact pattern + the worked dashboard example + the client data-layer API they call. No "TBD".

**Type consistency:** ids are `string` everywhere; `updatedAt: string` (ISO) in local/sync types, `Date` in Drizzle rows (converted at the sync boundary via `toIso`/`new Date(...)`); `mergeRow`/`Syncable` shapes match the local row types; client data-layer function names mirror the existing server `lib/data/*` names so components swap imports cleanly.

> Stage 1 = Tasks 1–10 (delivers offline + two-way sync). Stage 2 = Task 11. Task 12 is the one-time cutover.
