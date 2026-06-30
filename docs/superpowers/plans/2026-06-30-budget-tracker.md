# Budget Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user, mobile-first PWA budget tracker where the owner logs expenses into custom categories with monthly budget limits, browses month by month, and sees totals accumulate — built in Next.js + Neon, installable to the iOS home screen.

**Architecture:** Next.js App Router fullstack. Pure logic (money/date/validation) is built first with strict TDD, then a Drizzle data-access layer tested against an in-memory Postgres (PGlite), then thin Server Actions wrap that layer with auth + revalidation. UI is built against **semantic CSS-variable design tokens** so component code is theme-independent; the user picks one of 10 static mockups at a mid-plan checkpoint, and a single task wires that theme's token values in.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Drizzle ORM, `@neondatabase/serverless` (Neon Postgres), Zod, `jose` (session JWT), `sonner` (toasts), Vitest + @testing-library/react + jsdom, `@electric-sql/pglite` (test DB). Deployed on Vercel.

## Global Constraints

- **Currency:** PHP (₱). All money stored and computed as **integer centavos** (₱1.00 = `100`). Formatting to `₱1,250.00` happens only at display time.
- **Single user.** No user table. One passcode in env var `APP_PASSCODE`; session cookie signed with `AUTH_SECRET`.
- **Env vars:** `DATABASE_URL` (Neon), `APP_PASSCODE`, `AUTH_SECRET`. Never commit `.env*`.
- **Month model:** browse by month, default current; group/filter transactions by `occurred_on` (a `date`). Month is 1–12 in code.
- **TypeScript strict.** No `any` in committed code except the documented Drizzle `PgDatabase<any, typeof schema>` data-access parameter type.
- **Mobile-first.** Layout respects `env(safe-area-inset-*)`; inputs use ≥16px font to prevent iOS zoom.
- **Theming:** UI components reference semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-accent`, `.surface`, etc.). The chosen theme defines those token values — components are never hardcoded to one look.
- **Discipline:** DRY, YAGNI, TDD (red → green → commit), conventional-commit messages, one commit per task minimum.
- **Test commands:** `npx vitest run <path>` (single file), `npx vitest run` (all). Component test files start with `// @vitest-environment jsdom`.
- **Reference docs to check when unsure:** Drizzle + Neon HTTP <https://orm.drizzle.team/docs/get-started/neon-new>; Drizzle + PGlite <https://orm.drizzle.team/docs/connect-pglite>; Next.js Server Actions <https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations>; Next.js manifest/metadata <https://nextjs.org/docs/app/api-reference/file-conventions/metadata>; Tailwind v4 <https://tailwindcss.com/docs>; jose <https://github.com/panva/jose>.

---

## Task Map

| # | Task | Deliverable |
|---|---|---|
| 1 | Scaffold project & tooling | App runs, sample test passes |
| 2 | Money utilities (TDD) | `lib/money.ts` |
| 3 | Month utilities (TDD) | `lib/month.ts` |
| 4 | Zod schemas (TDD) | `lib/schemas.ts` |
| 5 | DB schema, client, migrations, test DB helper | `lib/db/*` |
| 6 | Category data access (TDD/PGlite) | `lib/data/categories.ts` |
| 7 | Transaction & overview data access (TDD/PGlite) | `lib/data/transactions.ts`, `lib/data/overview.ts` |
| 8 | Session auth (TDD) + middleware | `lib/auth.ts`, `middleware.ts` |
| 9 | Server Actions (auth, categories, expenses) | `app/actions/*` |
| 10 | Root layout, PWA manifest, login page | `app/layout.tsx`, `app/manifest.ts`, `app/login` |
| 11 | `/themes` static gallery (10 mockups) | `app/themes/page.tsx` → **CHECKPOINT: user picks** |
| 12 | Apply chosen theme tokens | `app/globals.css` |
| 13 | Shared UI primitives | `components/*` |
| 14 | Dashboard page | `app/page.tsx` |
| 15 | Add Expense sheet | `components/expense-sheet.tsx` |
| 16 | Category detail + history | `app/category/[id]/page.tsx` |
| 17 | Manage categories | `app/categories/page.tsx` |
| 18 | First-run seed + final test pass | `lib/data/seed.ts` |
| 19 | Deploy to Vercel + iOS install verify | live URL |

---

## Task 1: Scaffold project & tooling

**Files:**
- Create: whole Next.js project in repo root (`package.json`, `tsconfig.json`, `app/`, `app/globals.css`, etc.)
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Create: `.env.example`
- Test: `lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a working Next.js + Tailwind + Vitest workspace consumed by every later task.

- [ ] **Step 1: Scaffold Next.js** (run in repo root; the dir already contains `docs/` and `.git/`, so scaffold in place)

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack --yes
```

Expected: Next.js app created with `app/`, `app/globals.css`, Tailwind v4 configured, `@/*` import alias.

- [ ] **Step 2: Add runtime + dev dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless zod jose sonner
npm install -D drizzle-kit @electric-sql/pglite vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom dotenv
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: false });
```

- [ ] **Step 5: Add test scripts to `package.json`** (merge into existing `"scripts"`)

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push"
}
```

- [ ] **Step 6: Create `.env.example`**

```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
APP_PASSCODE="change-me"
AUTH_SECRET="a-long-random-string-at-least-32-chars"
```

- [ ] **Step 7: Write smoke test** `lib/__tests__/smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs the test runner", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Run smoke test**

Run: `npx vitest run lib/__tests__/smoke.test.ts`
Expected: 1 passed.

- [ ] **Step 9: Verify the app builds**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js app with tailwind, vitest, and core deps"
```

---

## Task 2: Money utilities (TDD)

**Files:**
- Create: `lib/money.ts`
- Test: `lib/__tests__/money.test.ts`

**Interfaces:**
- Produces:
  - `parseAmountToCentavos(input: string): number | null` — parses user input like `"1,250.5"` → `125050`; returns `null` for invalid/negative/empty.
  - `formatCentavos(centavos: number, opts?: { symbol?: boolean }): string` — `125050` → `"₱1,250.00"` (or `"1,250.00"` when `symbol:false`).

- [ ] **Step 1: Write failing tests** `lib/__tests__/money.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parseAmountToCentavos, formatCentavos } from "@/lib/money";

describe("parseAmountToCentavos", () => {
  it("parses whole pesos", () => expect(parseAmountToCentavos("1250")).toBe(125000));
  it("parses decimals", () => expect(parseAmountToCentavos("1250.5")).toBe(125050));
  it("strips thousands commas", () => expect(parseAmountToCentavos("1,250.50")).toBe(125050));
  it("rounds to 2 decimals", () => expect(parseAmountToCentavos("0.005")).toBe(1));
  it("rejects empty", () => expect(parseAmountToCentavos("")).toBeNull());
  it("rejects non-numeric", () => expect(parseAmountToCentavos("abc")).toBeNull());
  it("rejects negative", () => expect(parseAmountToCentavos("-5")).toBeNull());
});

describe("formatCentavos", () => {
  it("formats with symbol and grouping", () => expect(formatCentavos(125050)).toBe("₱1,250.50"));
  it("formats zero", () => expect(formatCentavos(0)).toBe("₱0.00"));
  it("omits symbol when asked", () => expect(formatCentavos(125050, { symbol: false })).toBe("1,250.50"));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/money.test.ts`
Expected: FAIL — module `@/lib/money` not found.

- [ ] **Step 3: Implement** `lib/money.ts`

```ts
export function parseAmountToCentavos(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatCentavos(centavos: number, opts?: { symbol?: boolean }): string {
  const symbol = opts?.symbol ?? true;
  const amount = (centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `₱${amount}` : amount;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/money.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add lib/money.ts lib/__tests__/money.test.ts
git commit -m "feat: add centavo money parse/format helpers"
```

---

## Task 3: Month utilities (TDD)

**Files:**
- Create: `lib/month.ts`
- Test: `lib/__tests__/month.test.ts`

**Interfaces:**
- Produces:
  - `interface YearMonth { year: number; month: number }` — `month` is 1–12.
  - `getYearMonth(date: Date): YearMonth`
  - `monthRange(ym: YearMonth): { start: string; end: string }` — ISO `YYYY-MM-DD`, **half-open** `[start, end)` (end = first day of next month). Used by queries as `occurred_on >= start AND occurred_on < end`.
  - `shiftMonth(ym: YearMonth, delta: number): YearMonth`
  - `formatMonthLabel(ym: YearMonth): string` — e.g. `"June 2026"`.

- [ ] **Step 1: Write failing tests** `lib/__tests__/month.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { getYearMonth, monthRange, shiftMonth, formatMonthLabel } from "@/lib/month";

describe("getYearMonth", () => {
  it("extracts 1-based month", () => {
    expect(getYearMonth(new Date("2026-06-30T12:00:00Z"))).toEqual({ year: 2026, month: 6 });
  });
});

describe("monthRange", () => {
  it("returns half-open range", () => {
    expect(monthRange({ year: 2026, month: 6 })).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });
  it("wraps year at december", () => {
    expect(monthRange({ year: 2026, month: 12 })).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("shiftMonth", () => {
  it("goes back across year", () => expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 }));
  it("goes forward across year", () => expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 }));
});

describe("formatMonthLabel", () => {
  it("formats label", () => expect(formatMonthLabel({ year: 2026, month: 6 })).toBe("June 2026"));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/month.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `lib/month.ts`

```ts
export interface YearMonth {
  year: number;
  month: number; // 1-12
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getYearMonth(date: Date): YearMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthRange(ym: YearMonth): { start: string; end: string } {
  const next = shiftMonth(ym, 1);
  return {
    start: `${ym.year}-${pad(ym.month)}-01`,
    end: `${next.year}-${pad(next.month)}-01`,
  };
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const zeroBased = ym.month - 1 + delta;
  const year = ym.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return { year, month };
}

export function formatMonthLabel(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/month.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add lib/month.ts lib/__tests__/month.test.ts
git commit -m "feat: add year-month range and label helpers"
```

---

## Task 4: Zod schemas (TDD)

**Files:**
- Create: `lib/schemas.ts`
- Test: `lib/__tests__/schemas.test.ts`

**Interfaces:**
- Produces:
  - `categorySchema` → `type CategoryInput = { name: string; emoji: string; color: string; monthlyBudget: number }` (`monthlyBudget` ≥ 0 integer centavos).
  - `expenseSchema` → `type ExpenseInput = { categoryId: number; amount: number; description: string; occurredOn: string }` (`amount` > 0 integer; `occurredOn` = `YYYY-MM-DD`).

- [ ] **Step 1: Write failing tests** `lib/__tests__/schemas.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { categorySchema, expenseSchema } from "@/lib/schemas";

describe("categorySchema", () => {
  it("accepts valid input", () => {
    const r = categorySchema.safeParse({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    expect(r.success).toBe(true);
  });
  it("rejects empty name", () => {
    expect(categorySchema.safeParse({ name: "", emoji: "🍜", color: "#10b981", monthlyBudget: 0 }).success).toBe(false);
  });
  it("rejects negative budget", () => {
    expect(categorySchema.safeParse({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: -1 }).success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("accepts valid input", () => {
    const r = expenseSchema.safeParse({ categoryId: 1, amount: 12500, description: "Lunch", occurredOn: "2026-06-30" });
    expect(r.success).toBe(true);
  });
  it("rejects zero amount", () => {
    expect(expenseSchema.safeParse({ categoryId: 1, amount: 0, description: "", occurredOn: "2026-06-30" }).success).toBe(false);
  });
  it("rejects bad date", () => {
    expect(expenseSchema.safeParse({ categoryId: 1, amount: 100, description: "", occurredOn: "30-06-2026" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/schemas.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `lib/schemas.ts`

```ts
import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  emoji: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  monthlyBudget: z.number().int().min(0),
});

export const expenseSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().int().positive(),
  description: z.string().trim().max(140).default(""),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/schemas.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas.ts lib/__tests__/schemas.test.ts
git commit -m "feat: add category and expense validation schemas"
```

---

## Task 5: DB schema, client, migrations, test DB helper

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `lib/db/types.ts`, `drizzle.config.ts`, `lib/test/db.ts`
- Generated: `drizzle/` migration folder

**Interfaces:**
- Produces:
  - `categories`, `transactions` Drizzle tables; types `Category`, `NewCategory`, `Transaction`, `NewTransaction`.
  - `type DB = PgDatabase<any, typeof schema>` (accepted by all data-access fns — satisfied by both Neon and PGlite).
  - `db` — the app's Neon-backed instance.
  - `createTestDb(): Promise<DB>` — fresh migrated in-memory PGlite DB for tests.

- [ ] **Step 1: Implement schema** `lib/db/schema.ts`

```ts
import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("📦"),
  color: text("color").notNull().default("#10b981"),
  monthlyBudget: integer("monthly_budget").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description").notNull().default(""),
  occurredOn: date("occurred_on").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
```

- [ ] **Step 2: Implement DB type** `lib/db/types.ts`

```ts
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Satisfied by both neon-http and pglite drizzle instances.
export type DB = PgDatabase<any, typeof schema>;
```

- [ ] **Step 3: Implement app client** `lib/db/client.ts`

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 4: Implement** `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 5: Generate migrations**

Run: `npm run db:generate`
Expected: a SQL file appears under `drizzle/` creating both tables.

- [ ] **Step 6: Implement test DB helper** `lib/test/db.ts`

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";

export async function createTestDb(): Promise<DB> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as DB;
}
```

- [ ] **Step 7: Write a migration sanity test** `lib/__tests__/db.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb } from "@/lib/test/db";

describe("test db", () => {
  it("creates tables from migrations", async () => {
    const db = await createTestDb();
    const res = await db.execute(sql`select count(*)::int as n from categories`);
    expect((res.rows[0] as { n: number }).n).toBe(0);
  });
});
```

- [ ] **Step 8: Run the sanity test**

Run: `npx vitest run lib/__tests__/db.test.ts`
Expected: PASS (0 rows).

- [ ] **Step 9: Commit**

```bash
git add lib/db drizzle drizzle.config.ts lib/test/db.ts lib/__tests__/db.test.ts
git commit -m "feat: add drizzle schema, neon client, and pglite test db"
```

---

## Task 6: Category data access (TDD/PGlite)

**Files:**
- Create: `lib/data/categories.ts`
- Test: `lib/__tests__/categories.data.test.ts`

**Interfaces:**
- Consumes: `DB` (Task 5), `CategoryInput` (Task 4), `Category` (Task 5).
- Produces:
  - `listCategories(db: DB): Promise<Category[]>` — non-archived, ordered by `sortOrder` then `id`.
  - `createCategory(db: DB, input: CategoryInput): Promise<Category>`
  - `updateCategory(db: DB, id: number, input: CategoryInput): Promise<Category>`
  - `deleteCategory(db: DB, id: number): Promise<void>` (cascades transactions via FK).

- [ ] **Step 1: Write failing tests** `lib/__tests__/categories.data.test.ts`

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/categories.data.test.ts`
Expected: FAIL — module `@/lib/data/categories` not found.

- [ ] **Step 3: Implement** `lib/data/categories.ts`

```ts
import { asc, eq } from "drizzle-orm";
import { categories, type Category } from "@/lib/db/schema";
import type { CategoryInput } from "@/lib/schemas";
import type { DB } from "@/lib/db/types";

export async function listCategories(db: DB): Promise<Category[]> {
  return db.select().from(categories)
    .where(eq(categories.archived, false))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function createCategory(db: DB, input: CategoryInput): Promise<Category> {
  const [row] = await db.insert(categories).values(input).returning();
  return row;
}

export async function updateCategory(db: DB, id: number, input: CategoryInput): Promise<Category> {
  const [row] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
  return row;
}

export async function deleteCategory(db: DB, id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/categories.data.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add lib/data/categories.ts lib/__tests__/categories.data.test.ts
git commit -m "feat: add category data-access layer"
```

---

## Task 7: Transaction & overview data access (TDD/PGlite)

**Files:**
- Create: `lib/data/transactions.ts`, `lib/data/overview.ts`
- Test: `lib/__tests__/transactions.data.test.ts`, `lib/__tests__/overview.data.test.ts`

**Interfaces:**
- Consumes: `DB`, `ExpenseInput`, `YearMonth`, `monthRange`, `Category`, `Transaction`.
- Produces:
  - `addExpense(db: DB, input: ExpenseInput): Promise<Transaction>`
  - `updateExpense(db: DB, id: number, input: ExpenseInput): Promise<Transaction>`
  - `deleteExpense(db: DB, id: number): Promise<void>`
  - `listTransactions(db: DB, args: { categoryId: number; ym: YearMonth }): Promise<Transaction[]>` — ordered by `occurredOn` desc then `id` desc.
  - `getCategoriesWithMonthTotals(db: DB, ym: YearMonth): Promise<Array<{ category: Category; spent: number }>>`
  - `getMonthOverview(db: DB, ym: YearMonth): Promise<{ spent: number; budget: number; remaining: number }>`

- [ ] **Step 1: Write failing tests** `lib/__tests__/transactions.data.test.ts`

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/transactions.data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `lib/data/transactions.ts`

```ts
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { transactions, type Transaction } from "@/lib/db/schema";
import type { ExpenseInput } from "@/lib/schemas";
import type { DB } from "@/lib/db/types";
import { monthRange, type YearMonth } from "@/lib/month";

export async function addExpense(db: DB, input: ExpenseInput): Promise<Transaction> {
  const [row] = await db.insert(transactions).values(input).returning();
  return row;
}

export async function updateExpense(db: DB, id: number, input: ExpenseInput): Promise<Transaction> {
  const [row] = await db.update(transactions).set(input).where(eq(transactions.id, id)).returning();
  return row;
}

export async function deleteExpense(db: DB, id: number): Promise<void> {
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function listTransactions(
  db: DB,
  args: { categoryId: number; ym: YearMonth },
): Promise<Transaction[]> {
  const { start, end } = monthRange(args.ym);
  return db.select().from(transactions)
    .where(and(
      eq(transactions.categoryId, args.categoryId),
      gte(transactions.occurredOn, start),
      lt(transactions.occurredOn, end),
    ))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/transactions.data.test.ts`
Expected: all passed.

- [ ] **Step 5: Write failing overview tests** `lib/__tests__/overview.data.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { createCategory } from "@/lib/data/categories";
import { addExpense } from "@/lib/data/transactions";
import { getCategoriesWithMonthTotals, getMonthOverview } from "@/lib/data/overview";
import type { DB } from "@/lib/db/types";

let db: DB;
beforeEach(async () => { db = await createTestDb(); });

describe("overview", () => {
  it("totals spend per category for the month", async () => {
    const food = await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    const fun = await createCategory(db, { name: "Fun", emoji: "🎮", color: "#6366f1", monthlyBudget: 200000 });
    await addExpense(db, { categoryId: food.id, amount: 12500, description: "", occurredOn: "2026-06-10" });
    await addExpense(db, { categoryId: food.id, amount: 7500, description: "", occurredOn: "2026-06-15" });
    await addExpense(db, { categoryId: fun.id, amount: 30000, description: "", occurredOn: "2026-06-01" });
    await addExpense(db, { categoryId: food.id, amount: 99999, description: "", occurredOn: "2026-05-20" }); // other month

    const rows = await getCategoriesWithMonthTotals(db, { year: 2026, month: 6 });
    const foodRow = rows.find(r => r.category.id === food.id)!;
    const funRow = rows.find(r => r.category.id === fun.id)!;
    expect(foodRow.spent).toBe(20000);
    expect(funRow.spent).toBe(30000);
  });

  it("computes month overview totals", async () => {
    const food = await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    await addExpense(db, { categoryId: food.id, amount: 20000, description: "", occurredOn: "2026-06-10" });
    const o = await getMonthOverview(db, { year: 2026, month: 6 });
    expect(o.spent).toBe(20000);
    expect(o.budget).toBe(500000);
    expect(o.remaining).toBe(480000);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run lib/__tests__/overview.data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement** `lib/data/overview.ts`

```ts
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { categories, transactions, type Category } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { monthRange, type YearMonth } from "@/lib/month";
import { listCategories } from "@/lib/data/categories";

export async function getCategoriesWithMonthTotals(
  db: DB,
  ym: YearMonth,
): Promise<Array<{ category: Category; spent: number }>> {
  const { start, end } = monthRange(ym);
  const cats = await listCategories(db);
  const sums = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .where(and(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end)))
    .groupBy(transactions.categoryId);

  const byId = new Map(sums.map(s => [s.categoryId, Number(s.total)]));
  return cats.map(category => ({ category, spent: byId.get(category.id) ?? 0 }));
}

export async function getMonthOverview(
  db: DB,
  ym: YearMonth,
): Promise<{ spent: number; budget: number; remaining: number }> {
  const rows = await getCategoriesWithMonthTotals(db, ym);
  const spent = rows.reduce((acc, r) => acc + r.spent, 0);
  const budget = rows.reduce((acc, r) => acc + r.category.monthlyBudget, 0);
  return { spent, budget, remaining: budget - spent };
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run lib/__tests__/overview.data.test.ts`
Expected: all passed.

- [ ] **Step 9: Commit**

```bash
git add lib/data/transactions.ts lib/data/overview.ts lib/__tests__/transactions.data.test.ts lib/__tests__/overview.data.test.ts
git commit -m "feat: add transaction and monthly-overview data access"
```

---

## Task 8: Session auth (TDD) + middleware

**Files:**
- Create: `lib/auth.ts`, `middleware.ts`
- Test: `lib/__tests__/auth.test.ts`

**Interfaces:**
- Produces:
  - `const SESSION_COOKIE = "bt_session"`
  - `signSession(secret: string): Promise<string>` — signs a JWT marking an authenticated session.
  - `verifySession(token: string | undefined, secret: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests** `lib/__tests__/auth.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/auth";

const secret = "test-secret-at-least-32-characters-long!!";

describe("session", () => {
  it("verifies a token it signed", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token, secret)).toBe(true);
  });
  it("rejects undefined", async () => {
    expect(await verifySession(undefined, secret)).toBe(false);
  });
  it("rejects tampered token", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token + "x", secret)).toBe(false);
  });
  it("rejects wrong secret", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token, "another-secret-at-least-32-characters!!")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/auth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `lib/auth.ts`

```ts
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bt_session";

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(secret: string): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(secret));
    return payload.ok === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/auth.test.ts`
Expected: all passed.

- [ ] **Step 5: Implement** `middleware.ts` (edge-safe; protects all routes except `/login` and static assets)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/manifest.webmanifest", "/icon", "/apple-icon"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySession(token, process.env.AUTH_SECRET!);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts middleware.ts lib/__tests__/auth.test.ts
git commit -m "feat: add passcode session signing and route middleware"
```

---

## Task 9: Server Actions (auth, categories, expenses)

**Files:**
- Create: `app/actions/auth.ts`, `app/actions/categories.ts`, `app/actions/expenses.ts`, `lib/action-result.ts`
- Test: `lib/__tests__/action-result.test.ts`

**Interfaces:**
- Consumes: data-access layer (Tasks 6–7), schemas (Task 4), money parser (Task 2), auth (Task 8), app `db` (Task 5).
- Produces (all are `"use server"` functions usable as `<form action>` handlers via `useActionState`):
  - `type ActionResult = { ok: true } | { ok: false; error: string }`
  - `loginAction(prev: ActionResult, form: FormData): Promise<ActionResult>`
  - `logoutAction(): Promise<void>`
  - `createCategoryAction(prev, form)`, `updateCategoryAction(prev, form)`, `deleteCategoryAction(form)`
  - `addExpenseAction(prev, form)`, `updateExpenseAction(prev, form)`, `deleteExpenseAction(form)`
  - Form field names are defined inline below and consumed by the UI tasks.

- [ ] **Step 1: Write failing test for the result helper** `lib/__tests__/action-result.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/action-result";

describe("action-result", () => {
  it("builds ok", () => expect(ok()).toEqual({ ok: true }));
  it("builds fail", () => expect(fail("nope")).toEqual({ ok: false, error: "nope" }));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/action-result.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `lib/action-result.ts`

```ts
export type ActionResult = { ok: true } | { ok: false; error: string };
export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): ActionResult => ({ ok: false, error });
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/action-result.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement** `app/actions/auth.ts`

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function loginAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const passcode = String(form.get("passcode") ?? "");
  if (passcode !== process.env.APP_PASSCODE) return fail("Incorrect passcode");
  const token = await signSession(process.env.AUTH_SECRET!);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
  return ok();
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
```

- [ ] **Step 6: Implement** `app/actions/categories.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categorySchema } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { createCategory, updateCategory, deleteCategory } from "@/lib/data/categories";
import { ok, fail, type ActionResult } from "@/lib/action-result";

function readCategoryForm(form: FormData) {
  const budget = parseAmountToCentavos(String(form.get("monthlyBudget") ?? "0")) ?? 0;
  return categorySchema.safeParse({
    name: String(form.get("name") ?? ""),
    emoji: String(form.get("emoji") ?? "📦"),
    color: String(form.get("color") ?? "#10b981"),
    monthlyBudget: budget,
  });
}

export async function createCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = readCategoryForm(form);
  if (!parsed.success) return fail("Please check the category details");
  await createCategory(db, parsed.data);
  revalidatePath("/");
  revalidatePath("/categories");
  return ok();
}

export async function updateCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = Number(form.get("id"));
  const parsed = readCategoryForm(form);
  if (!Number.isInteger(id) || !parsed.success) return fail("Please check the category details");
  await updateCategory(db, id, parsed.data);
  revalidatePath("/");
  revalidatePath("/categories");
  return ok();
}

export async function deleteCategoryAction(form: FormData): Promise<void> {
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) {
    await deleteCategory(db, id);
    revalidatePath("/");
    revalidatePath("/categories");
  }
}
```

- [ ] **Step 7: Implement** `app/actions/expenses.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { expenseSchema } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { addExpense, updateExpense, deleteExpense } from "@/lib/data/transactions";
import { ok, fail, type ActionResult } from "@/lib/action-result";

function readExpenseForm(form: FormData) {
  const amount = parseAmountToCentavos(String(form.get("amount") ?? ""));
  return expenseSchema.safeParse({
    categoryId: Number(form.get("categoryId")),
    amount: amount ?? 0,
    description: String(form.get("description") ?? ""),
    occurredOn: String(form.get("occurredOn") ?? ""),
  });
}

export async function addExpenseAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = readExpenseForm(form);
  if (!parsed.success) return fail("Enter a valid amount and category");
  await addExpense(db, parsed.data);
  revalidatePath("/");
  revalidatePath(`/category/${parsed.data.categoryId}`);
  return ok();
}

export async function updateExpenseAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = Number(form.get("id"));
  const parsed = readExpenseForm(form);
  if (!Number.isInteger(id) || !parsed.success) return fail("Enter a valid amount and category");
  await updateExpense(db, id, parsed.data);
  revalidatePath("/");
  revalidatePath(`/category/${parsed.data.categoryId}`);
  return ok();
}

export async function deleteExpenseAction(form: FormData): Promise<void> {
  const id = Number(form.get("id"));
  const categoryId = Number(form.get("categoryId"));
  if (Number.isInteger(id)) {
    await deleteExpense(db, id);
    revalidatePath("/");
    if (Number.isInteger(categoryId)) revalidatePath(`/category/${categoryId}`);
  }
}
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 9: Commit**

```bash
git add app/actions lib/action-result.ts lib/__tests__/action-result.test.ts
git commit -m "feat: add server actions for auth, categories, and expenses"
```

---

## Task 10: Root layout, PWA manifest, login page

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`
- Create: `app/manifest.ts`, `app/login/page.tsx`, `app/login/login-form.tsx`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` (placeholder icons OK for now)

**Interfaces:**
- Consumes: `loginAction` (Task 9), `sonner` Toaster.
- Produces: authenticated app shell with safe-area handling, PWA manifest, and a working passcode login screen. Defines the **default** token set (overwritten by the chosen theme in Task 12).

- [ ] **Step 1: Define default tokens + safe-area in** `app/globals.css` (replace file contents)

```css
@import "tailwindcss";

:root {
  --background: #f7f7f8;
  --foreground: #111114;
  --card: #ffffff;
  --card-foreground: #111114;
  --muted: #f0f0f2;
  --muted-foreground: #6b6b73;
  --accent: #10b981;
  --accent-foreground: #ffffff;
  --border: #e6e6ea;
  --danger: #ef4444;
  --radius: 1rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-danger: var(--danger);
  --radius-theme: var(--radius);
}

html, body {
  background: var(--background);
  color: var(--foreground);
  -webkit-tap-highlight-color: transparent;
}

/* Theme-overridable surface utility (Task 12 may redefine for glass/neumorphic looks). */
.surface {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.safe-top { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

input, select, textarea { font-size: 16px; } /* prevent iOS zoom */
```

- [ ] **Step 2: Implement** `app/manifest.ts`

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budget Tracker",
    short_name: "Budget",
    description: "Personal monthly budget tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f8",
    theme_color: "#10b981",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 3: Implement** `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget Tracker",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Budget" },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh safe-top safe-bottom">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Implement** `app/login/login-form.tsx`

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/action-result";

const initial: ActionResult = { ok: true };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="w-full max-w-xs space-y-4">
      <input
        name="passcode"
        type="password"
        inputMode="numeric"
        autoFocus
        placeholder="Passcode"
        className="surface w-full px-4 py-3 outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius)] bg-accent px-4 py-3 font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Implement** `app/login/page.tsx`

```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <div className="text-5xl">💸</div>
        <h1 className="mt-3 text-xl font-semibold">Budget Tracker</h1>
        <p className="text-muted-foreground text-sm">Enter your passcode</p>
      </div>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 6: Add placeholder PWA icons**

Generate three solid-color PNG placeholders so the manifest resolves (replace with real art later):

```bash
node -e "const z=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'); for (const f of ['public/icon-192.png','public/icon-512.png','public/icon-maskable-512.png']) require('fs').writeFileSync(f,z);"
```

Expected: three PNG files created under `public/`.

- [ ] **Step 7: Manual verify (dev)**

Run: `npm run dev` then open `http://localhost:3000` — expect redirect to `/login`. Enter the wrong passcode → red toast. (Full login needs `.env` with `APP_PASSCODE`/`AUTH_SECRET`/`DATABASE_URL`; set `.env.local` to test end to end.)

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/globals.css app/manifest.ts app/login public/icon-*.png
git commit -m "feat: add app shell, PWA manifest, and passcode login screen"
```

---

## Task 11: `/themes` static gallery (10 mockups) — **HUMAN CHECKPOINT**

**Files:**
- Create: `app/themes/page.tsx`, `app/themes/theme-card.tsx`, `lib/themes.ts`

**Interfaces:**
- Produces: `lib/themes.ts` exporting `THEMES: ThemeDef[]` where
  `type ThemeDef = { id: string; name: string; blurb: string; tokens: Record<string,string>; surfaceCss?: string; fontStack?: string }`.
  Task 12 consumes the chosen `ThemeDef.tokens`/`surfaceCss`/`fontStack`.

This task is intentionally **visual/design-led**. Use the `frontend-design` skill during execution to make each mockup genuinely distinct and polished. Each card renders a small static mock of the dashboard (an overview bar + 2 category cards) styled by that theme's tokens, so the look is judged at a glance.

- [ ] **Step 1: Define the 10 themes** `lib/themes.ts`

Define `THEMES` with all 10 entries from spec §8 (Minimal Mono, Dark Glass, Neumorphic Soft, iOS Native, Playful Candy, Brutalist, Warm Earthy, Fintech Pro, Aurora Gradient, Retro Terminal). Each entry sets the token values (`--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--danger`, `--radius`), an optional `surfaceCss` string for non-flat looks (glass/neumorphic/brutalist), and an optional `fontStack`. Example two entries (fill the rest in the same shape):

```ts
export type ThemeDef = {
  id: string;
  name: string;
  blurb: string;
  tokens: Record<string, string>;
  surfaceCss?: string;
  fontStack?: string;
};

export const THEMES: ThemeDef[] = [
  {
    id: "minimal-mono",
    name: "Minimal Mono",
    blurb: "White space, one accent, system font.",
    tokens: {
      "--background": "#ffffff", "--foreground": "#0a0a0a", "--card": "#ffffff",
      "--card-foreground": "#0a0a0a", "--muted": "#f4f4f5", "--muted-foreground": "#71717a",
      "--accent": "#111827", "--accent-foreground": "#ffffff", "--border": "#e4e4e7",
      "--danger": "#dc2626", "--radius": "0.75rem",
    },
  },
  {
    id: "dark-glass",
    name: "Dark Glass",
    blurb: "Frosted cards on a dark canvas, neon accent.",
    tokens: {
      "--background": "#0b1020", "--foreground": "#e8ecf5", "--card": "rgba(255,255,255,0.06)",
      "--card-foreground": "#e8ecf5", "--muted": "rgba(255,255,255,0.08)", "--muted-foreground": "#9aa3b8",
      "--accent": "#22d3ee", "--accent-foreground": "#04121a", "--border": "rgba(255,255,255,0.12)",
      "--danger": "#fb7185", "--radius": "1.25rem",
    },
    surfaceCss: "backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);",
  },
  // … 8 more: neumorphic-soft, ios-native, playful-candy, brutalist,
  //   warm-earthy, fintech-pro, aurora-gradient, retro-terminal
];
```

- [ ] **Step 2: Implement** `app/themes/theme-card.tsx` — a client component that renders a mini dashboard mock inside a scoped wrapper whose `style` applies the theme's token CSS variables (so each card previews independently on one page). Include the overview bar and two sample category cards using `var(--…)` tokens and `formatCentavos` sample values.

- [ ] **Step 3: Implement** `app/themes/page.tsx` — a server component mapping `THEMES` to `<ThemeCard>`s in a single-column mobile list, each labeled with name + blurb. Header text: "Pick a theme — tell Claude the name and I'll build the app in it."

- [ ] **Step 4: Manual verify on phone**

Run dev server, open `/themes` in iOS Safari (or responsive view). Confirm all 10 look clearly distinct and legible on a phone-width screen.

- [ ] **Step 5: Commit**

```bash
git add app/themes lib/themes.ts
git commit -m "feat: add static /themes gallery with 10 design mockups"
```

- [ ] **Step 6: 🚦 CHECKPOINT — STOP and get the user's choice**

Present the gallery to the user and ask them to name the theme they want. **Do not proceed to Task 12 until the user picks one.** Record the chosen `ThemeDef.id`.

---

## Task 12: Apply chosen theme tokens

**Files:**
- Modify: `app/globals.css` (`:root` values, `.surface`, font), `app/layout.tsx` (font + `theme_color` if needed), `app/manifest.ts` (`theme_color`/`background_color`)

**Interfaces:**
- Consumes: the chosen `ThemeDef` from `lib/themes.ts` (Task 11).
- Produces: the whole app now renders in the chosen theme via the existing semantic tokens — no component changes required.

- [ ] **Step 1: Copy the chosen theme's `tokens` into `:root`** in `app/globals.css`, replacing the default values from Task 10.

- [ ] **Step 2: If the theme has `surfaceCss`**, fold it into the `.surface` rule (e.g. glass blur, neumorphic dual shadows, brutalist hard border/offset shadow).

- [ ] **Step 3: If the theme has a `fontStack`**, wire it: add the font (via `next/font` in `app/layout.tsx` for Google fonts, or a CSS `font-family`) and apply to `body`.

- [ ] **Step 4: Update** `theme_color`/`background_color` in `app/manifest.ts` and `app/layout.tsx` `viewport.themeColor` to match the theme's background/accent (keeps the iOS status bar on-theme).

- [ ] **Step 5: Manual verify**

Run dev, log in, confirm login + shell now reflect the chosen theme on a phone-width screen.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx app/manifest.ts
git commit -m "style: apply chosen theme tokens app-wide"
```

---

## Task 13: Shared UI primitives

**Files:**
- Create: `components/budget-bar.tsx`, `components/month-switcher.tsx`, `components/fab.tsx`, `components/sheet.tsx`
- Test: `components/__tests__/budget-bar.test.tsx`

**Interfaces:**
- Consumes: `formatCentavos` (Task 2), `YearMonth`/`shiftMonth`/`formatMonthLabel` (Task 3).
- Produces:
  - `<BudgetBar spent={number} budget={number} color?={string} />` — progress bar; clamps at 100%, turns danger when `spent > budget`, hides bar when `budget === 0`.
  - `<MonthSwitcher ym={YearMonth} basePath={string} />` — renders `← Label →` with prev/next links to `${basePath}?y=&m=`.
  - `<Fab onClick={() => void} />` — floating "+" button, bottom-right, above safe area.
  - `<Sheet open onClose title>{children}</Sheet>` — bottom sheet modal (client).

- [ ] **Step 1: Write failing test** `components/__tests__/budget-bar.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetBar } from "@/components/budget-bar";

describe("BudgetBar", () => {
  it("shows spent and budget formatted", () => {
    render(<BudgetBar spent={20000} budget={500000} />);
    expect(screen.getByText(/₱200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/₱5,000\.00/)).toBeInTheDocument();
  });
  it("flags over budget", () => {
    render(<BudgetBar spent={600000} budget={500000} />);
    expect(screen.getByTestId("budget-bar")).toHaveAttribute("data-over", "true");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/__tests__/budget-bar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `components/budget-bar.tsx`

```tsx
import { formatCentavos } from "@/lib/money";

export function BudgetBar({ spent, budget, color }: { spent: number; budget: number; color?: string }) {
  const over = budget > 0 && spent > budget;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  return (
    <div data-testid="budget-bar" data-over={over} className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatCentavos(spent)}</span>
        {budget > 0 && <span className="text-muted-foreground">{formatCentavos(budget)}</span>}
      </div>
      {budget > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: over ? "var(--danger)" : color ?? "var(--accent)" }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run components/__tests__/budget-bar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement** `components/month-switcher.tsx`

```tsx
import Link from "next/link";
import { formatMonthLabel, shiftMonth, type YearMonth } from "@/lib/month";

export function MonthSwitcher({ ym, basePath }: { ym: YearMonth; basePath: string }) {
  const prev = shiftMonth(ym, -1);
  const next = shiftMonth(ym, 1);
  const href = (m: YearMonth) => `${basePath}?y=${m.year}&m=${m.month}`;
  return (
    <div className="flex items-center justify-between">
      <Link href={href(prev)} aria-label="Previous month" className="surface px-3 py-2">←</Link>
      <span className="font-medium">{formatMonthLabel(ym)}</span>
      <Link href={href(next)} aria-label="Next month" className="surface px-3 py-2">→</Link>
    </div>
  );
}
```

- [ ] **Step 6: Implement** `components/fab.tsx`

```tsx
"use client";

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Add expense"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accent-foreground shadow-lg"
    >
      +
    </button>
  );
}
```

- [ ] **Step 7: Implement** `components/sheet.tsx`

```tsx
"use client";

import { useEffect } from "react";

export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="surface w-full max-w-md rounded-b-none p-5 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no errors), then:

```bash
git add components/budget-bar.tsx components/month-switcher.tsx components/fab.tsx components/sheet.tsx components/__tests__/budget-bar.test.tsx
git commit -m "feat: add shared UI primitives (budget bar, month switcher, fab, sheet)"
```

---

## Task 14: Dashboard page

**Files:**
- Create: `app/page.tsx`, `components/category-card.tsx`, `components/dashboard-client.tsx`
- Test: `components/__tests__/category-card.test.tsx`

**Interfaces:**
- Consumes: `getCategoriesWithMonthTotals`, `getMonthOverview` (Task 7), `getYearMonth` (Task 3), `MonthSwitcher`/`BudgetBar`/`Fab` (Task 13), `ExpenseSheet` (Task 15 — wired here but built next).
- Produces: the dashboard at `/` reading `?y=&m=` (default current month): overview card, category list, FAB that opens the Add Expense sheet.

- [ ] **Step 1: Write failing test** `components/__tests__/category-card.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryCard } from "@/components/category-card";

const category = { id: 1, name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000, sortOrder: 0, archived: false, createdAt: new Date() };

describe("CategoryCard", () => {
  it("renders name, emoji, spent and links to detail", () => {
    render(<CategoryCard category={category as any} spent={20000} />);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("🍜")).toBeInTheDocument();
    expect(screen.getByText(/₱200\.00/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/category/1");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/__tests__/category-card.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `components/category-card.tsx`

```tsx
import Link from "next/link";
import type { Category } from "@/lib/db/schema";
import { BudgetBar } from "@/components/budget-bar";

export function CategoryCard({ category, spent }: { category: Category; spent: number }) {
  return (
    <Link href={`/category/${category.id}`} className="surface block p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-2xl">{category.emoji}</span>
        <span className="font-medium">{category.name}</span>
      </div>
      <BudgetBar spent={spent} budget={category.monthlyBudget} color={category.color} />
    </Link>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run components/__tests__/category-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement** `components/dashboard-client.tsx` (holds sheet open-state + FAB)

```tsx
"use client";

import { useState } from "react";
import { Fab } from "@/components/fab";
import { ExpenseSheet } from "@/components/expense-sheet";
import type { Category } from "@/lib/db/schema";

export function DashboardClient({ categories, defaultDate }: { categories: Category[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab onClick={() => setOpen(true)} />
      <ExpenseSheet open={open} onClose={() => setOpen(false)} categories={categories} defaultDate={defaultDate} />
    </>
  );
}
```

- [ ] **Step 6: Implement** `app/page.tsx`

```tsx
import { db } from "@/lib/db/client";
import { getCategoriesWithMonthTotals, getMonthOverview } from "@/lib/data/overview";
import { getYearMonth } from "@/lib/month";
import { formatCentavos } from "@/lib/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryCard } from "@/components/category-card";
import { DashboardClient } from "@/components/dashboard-client";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const sp = await searchParams;
  const now = getYearMonth(new Date());
  const ym = {
    year: sp.y ? Number(sp.y) : now.year,
    month: sp.m ? Number(sp.m) : now.month,
  };

  const [overview, rows] = await Promise.all([
    getMonthOverview(db, ym),
    getCategoriesWithMonthTotals(db, ym),
  ]);
  const categories = rows.map(r => r.category);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-4">
      <MonthSwitcher ym={ym} basePath="/" />

      <section className="surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Spent this month</span>
          <Link href="/categories" className="text-accent text-sm">Manage</Link>
        </div>
        <div className="mt-1 text-3xl font-semibold">{formatCentavos(overview.spent)}</div>
        <div className="mt-3"><BudgetBar spent={overview.spent} budget={overview.budget} /></div>
      </section>

      <section className="space-y-3">
        {rows.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No categories yet. Tap “Manage” to add one.
          </p>
        )}
        {rows.map(({ category, spent }) => (
          <CategoryCard key={category.id} category={category} spent={spent} />
        ))}
      </section>

      <DashboardClient categories={categories} defaultDate={defaultDate} />
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx components/category-card.tsx components/dashboard-client.tsx components/__tests__/category-card.test.tsx
git commit -m "feat: add dashboard with monthly overview and category cards"
```

---

## Task 15: Add Expense sheet

**Files:**
- Create: `components/expense-sheet.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 13), `addExpenseAction`/`updateExpenseAction` (Task 9), `Category`/`Transaction` (Task 5), `formatCentavos` (Task 2), `sonner`.
- Produces: `<ExpenseSheet open onClose categories defaultDate presetCategoryId? editTx? />` — one form used for **both add and edit**. When `editTx` is provided it prefills the fields, includes a hidden `id`, and posts to `updateExpenseAction`; otherwise it posts to `addExpenseAction`. Closes + toasts + `router.refresh()` on success. Uses `useTransition` for the `pending` state (the form's `action` IS the transition, so `pending` is correctly wired).

- [ ] **Step 1: Implement** `components/expense-sheet.tsx`

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/sheet";
import { addExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { formatCentavos } from "@/lib/money";
import type { Category, Transaction } from "@/lib/db/schema";

export function ExpenseSheet({
  open, onClose, categories, defaultDate, presetCategoryId, editTx,
}: {
  open: boolean; onClose: () => void; categories: Category[];
  defaultDate: string; presetCategoryId?: number; editTx?: Transaction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(editTx);

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit expense" : "Add expense"}>
      <form
        action={(fd) =>
          startTransition(async () => {
            const res = editing
              ? await updateExpenseAction({ ok: true }, fd)
              : await addExpenseAction({ ok: true }, fd);
            if (res.ok) {
              toast.success(editing ? "Expense updated" : "Expense added");
              router.refresh();
              onClose();
            } else {
              toast.error(res.error);
            }
          })
        }
        className="space-y-3"
      >
        {editTx && <input type="hidden" name="id" value={editTx.id} />}
        <input
          name="amount" inputMode="decimal" autoFocus placeholder="0.00"
          defaultValue={editTx ? formatCentavos(editTx.amount, { symbol: false }) : ""}
          className="surface w-full px-4 py-3 text-2xl outline-none"
        />
        <input
          name="description" placeholder="Description (optional)"
          defaultValue={editTx?.description ?? ""}
          className="surface w-full px-4 py-3 outline-none"
        />
        <select
          name="categoryId"
          defaultValue={editTx?.categoryId ?? presetCategoryId ?? categories[0]?.id}
          className="surface w-full px-4 py-3 outline-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
        <input
          name="occurredOn" type="date"
          defaultValue={editTx?.occurredOn ?? defaultDate}
          className="surface w-full px-4 py-3 outline-none"
        />
        <button
          type="submit" disabled={pending}
          className="w-full rounded-[var(--radius)] bg-accent px-4 py-3 font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Add expense"}
        </button>
      </form>
    </Sheet>
  );
}
```

Note: `Sheet` renders `null` when closed, so each open is a fresh mount — `defaultValue`s reset correctly whether opening for add or for a specific `editTx`. The form's `action` runs inside `startTransition`, so `pending` reflects the in-flight submit.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verify (needs `.env.local` + Neon)**

Run dev, log in, tap FAB, add an expense → toast + dashboard total updates.

- [ ] **Step 4: Commit**

```bash
git add components/expense-sheet.tsx
git commit -m "feat: add expense entry bottom sheet"
```

---

## Task 16: Category detail + history

**Files:**
- Create: `app/category/[id]/page.tsx`, `components/transaction-row.tsx`, `components/category-detail-client.tsx`

**Interfaces:**
- Consumes: `listTransactions` (Task 7), `listCategories` (Task 6), `getYearMonth`/`MonthSwitcher`/`BudgetBar`/`Fab`/`ExpenseSheet` (with `editTx`), `deleteExpenseAction` (Task 9), `formatCentavos`.
- Produces: `/category/[id]` showing the category's month total + budget bar, the month's transactions (newest first) — **each row taps to edit (reopens the expense sheet prefilled) and has a delete button** — a month switcher, and a category-scoped FAB to add. The transaction list lives inside the client wrapper so a row tap can drive the edit-sheet state.

- [ ] **Step 1: Implement** `components/transaction-row.tsx` (client; tap body to edit, button to delete)

```tsx
"use client";

import { formatCentavos } from "@/lib/money";
import { deleteExpenseAction } from "@/app/actions/expenses";
import type { Transaction } from "@/lib/db/schema";

export function TransactionRow({ tx, onEdit }: { tx: Transaction; onEdit: () => void }) {
  return (
    <div className="surface flex items-center justify-between p-3">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="truncate">{tx.description || "—"}</div>
        <div className="text-muted-foreground text-xs">{tx.occurredOn}</div>
      </button>
      <div className="flex items-center gap-3">
        <span className="font-medium">{formatCentavos(tx.amount)}</span>
        <form action={deleteExpenseAction}>
          <input type="hidden" name="id" value={tx.id} />
          <input type="hidden" name="categoryId" value={tx.categoryId} />
          <button type="submit" aria-label="Delete" className="text-muted-foreground">🗑</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement** `components/category-detail-client.tsx` (renders the list + manages add/edit sheet state)

```tsx
"use client";

import { useState } from "react";
import { Fab } from "@/components/fab";
import { ExpenseSheet } from "@/components/expense-sheet";
import { TransactionRow } from "@/components/transaction-row";
import type { Category, Transaction } from "@/lib/db/schema";

export function CategoryDetailClient({
  category, transactions, defaultDate,
}: { category: Category; transactions: Transaction[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>(undefined);

  function openAdd() { setEditTx(undefined); setOpen(true); }
  function openEdit(tx: Transaction) { setEditTx(tx); setOpen(true); }

  return (
    <>
      <section className="space-y-2">
        {transactions.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">No expenses this month.</p>
        )}
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} onEdit={() => openEdit(tx)} />
        ))}
      </section>

      <Fab onClick={openAdd} />
      <ExpenseSheet
        open={open}
        onClose={() => setOpen(false)}
        categories={[category]}
        defaultDate={defaultDate}
        presetCategoryId={category.id}
        editTx={editTx}
      />
    </>
  );
}
```

- [ ] **Step 3: Implement** `app/category/[id]/page.tsx` (fetches data; delegates the list + sheet to the client wrapper)

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { getYearMonth } from "@/lib/month";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryDetailClient } from "@/components/category-detail-client";

export default async function CategoryPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) notFound();

  const category = (await listCategories(db)).find((c) => c.id === categoryId);
  if (!category) notFound();

  const now = getYearMonth(new Date());
  const ym = { year: sp.y ? Number(sp.y) : now.year, month: sp.m ? Number(sp.m) : now.month };
  const txns = await listTransactions(db, { categoryId, ym });
  const spent = txns.reduce((a, t) => a + t.amount, 0);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-4">
      <Link href="/" className="text-accent text-sm">← Back</Link>
      <header className="surface p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-2xl">{category.emoji}</span>
          <span className="text-lg font-semibold">{category.name}</span>
        </div>
        <BudgetBar spent={spent} budget={category.monthlyBudget} color={category.color} />
      </header>

      <MonthSwitcher ym={ym} basePath={`/category/${categoryId}`} />

      <CategoryDetailClient category={category} transactions={txns} defaultDate={defaultDate} />
    </main>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no errors), then:

```bash
git add app/category components/transaction-row.tsx components/category-detail-client.tsx
git commit -m "feat: add category detail with monthly transaction history"
```

---

## Task 17: Manage categories

**Files:**
- Create: `app/categories/page.tsx`, `components/category-manager.tsx`

**Interfaces:**
- Consumes: `listCategories` (Task 6), `createCategoryAction`/`updateCategoryAction`/`deleteCategoryAction` (Task 9), `formatCentavos`/`parseAmountToCentavos`, `logoutAction` (Task 9).
- Produces: `/categories` — list existing categories with edit/delete, a create form (name, emoji, color, monthly budget), and a logout button.

- [ ] **Step 1: Implement** `components/category-manager.tsx` — a client component with:
  - a "New category" form posting to `createCategoryAction` (fields `name`, `emoji`, `color` as `<input type="color">`, `monthlyBudget` as decimal text), toast + `router.refresh()` on success;
  - per-row inline edit (prefilled form posting to `updateCategoryAction` with hidden `id`, budget shown via `formatCentavos(.., {symbol:false})`);
  - delete via a `deleteCategoryAction` form with a `confirm()`-free guarded button (use a two-tap "Delete?/Confirm" toggle in component state — **do not** use `window.confirm`, per browser-dialog guidance).

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCentavos } from "@/lib/money";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import type { ActionResult } from "@/lib/action-result";
import type { Category } from "@/lib/db/schema";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function submit(action: (p: ActionResult, f: FormData) => Promise<ActionResult>, fd: FormData) {
    const res = await action({ ok: true }, fd);
    if (res.ok) { toast.success("Saved"); router.refresh(); }
    else toast.error(res.error);
  }

  return (
    <div className="space-y-6">
      <form action={(fd) => submit(createCategoryAction, fd)} className="surface space-y-3 p-4">
        <h2 className="font-semibold">New category</h2>
        <input name="name" placeholder="Name" className="surface w-full px-3 py-2" />
        <div className="flex gap-3">
          <input name="emoji" placeholder="🍜" defaultValue="📦" className="surface w-20 px-3 py-2 text-center" />
          <input name="color" type="color" defaultValue="#10b981" className="surface h-11 w-16 p-1" />
          <input name="monthlyBudget" inputMode="decimal" placeholder="Budget" className="surface flex-1 px-3 py-2" />
        </div>
        <button className="w-full rounded-[var(--radius)] bg-accent px-4 py-2 text-accent-foreground">Add</button>
      </form>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="surface p-3">
            <form action={(fd) => submit(updateCategoryAction, fd)} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="emoji" defaultValue={c.emoji} className="surface w-14 px-2 py-2 text-center" />
              <input name="name" defaultValue={c.name} className="surface flex-1 px-2 py-2" />
              <input name="color" type="color" defaultValue={c.color} className="surface h-10 w-12 p-1" />
              <input name="monthlyBudget" inputMode="decimal" defaultValue={formatCentavos(c.monthlyBudget, { symbol: false })} className="surface w-24 px-2 py-2" />
              <button className="rounded-[var(--radius)] bg-accent px-3 py-2 text-sm text-accent-foreground">Save</button>
            </form>
            <form
              action={(fd) => { if (confirmId === c.id) { deleteCategoryAction(fd); router.refresh(); } }}
              className="mt-2 text-right"
            >
              <input type="hidden" name="id" value={c.id} />
              <button
                type={confirmId === c.id ? "submit" : "button"}
                onClick={() => setConfirmId(confirmId === c.id ? null : c.id)}
                className="text-danger text-sm"
              >
                {confirmId === c.id ? "Confirm delete" : "Delete"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement** `app/categories/page.tsx`

```tsx
import { db } from "@/lib/db/client";
import { listCategories } from "@/lib/data/categories";
import { CategoryManager } from "@/components/category-manager";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";

export default async function CategoriesPage() {
  const categories = await listCategories(db);
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-12 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-accent text-sm">← Back</Link>
        <form action={logoutAction}><button className="text-muted-foreground text-sm">Log out</button></form>
      </div>
      <h1 className="text-xl font-semibold">Categories</h1>
      <CategoryManager categories={categories} />
    </main>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no errors), then:

```bash
git add app/categories components/category-manager.tsx
git commit -m "feat: add category management screen"
```

---

## Task 18: First-run seed + final test pass

**Files:**
- Create: `lib/data/seed.ts`
- Test: `lib/__tests__/seed.data.test.ts`
- Modify: `app/page.tsx` (seed on first load when no categories exist)

**Interfaces:**
- Consumes: `DB`, `createCategory`, `listCategories`.
- Produces: `ensureSeedCategories(db: DB): Promise<void>` — inserts a few suggested starter categories **only if none exist** (idempotent).

- [ ] **Step 1: Write failing test** `lib/__tests__/seed.data.test.ts`

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/__tests__/seed.data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `lib/data/seed.ts`

```ts
import type { DB } from "@/lib/db/types";
import { listCategories, createCategory } from "@/lib/data/categories";
import type { CategoryInput } from "@/lib/schemas";

const STARTERS: CategoryInput[] = [
  { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0 },
  { name: "Transport", emoji: "🚌", color: "#3b82f6", monthlyBudget: 0 },
  { name: "Bills", emoji: "🧾", color: "#f59e0b", monthlyBudget: 0 },
  { name: "Fun", emoji: "🎮", color: "#8b5cf6", monthlyBudget: 0 },
];

export async function ensureSeedCategories(db: DB): Promise<void> {
  const existing = await listCategories(db);
  if (existing.length > 0) return;
  for (const s of STARTERS) await createCategory(db, s);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/__tests__/seed.data.test.ts`
Expected: PASS.

- [ ] **Step 5: Call seed from the dashboard** — in `app/page.tsx`, before fetching overview, add:

```tsx
import { ensureSeedCategories } from "@/lib/data/seed";
// …inside DashboardPage, before the Promise.all:
await ensureSeedCategories(db);
```

- [ ] **Step 6: Full test suite + typecheck + build**

Run: `npx vitest run` → all green.
Run: `npx tsc --noEmit` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 7: Commit**

```bash
git add lib/data/seed.ts lib/__tests__/seed.data.test.ts app/page.tsx
git commit -m "feat: seed starter categories on first run"
```

---

## Task 19: Deploy to Vercel + iOS install verify

**Files:** none (deploy + manual verification)

- [ ] **Step 1: Create the Neon database** — create a project at neon.tech, copy the pooled connection string.

- [ ] **Step 2: Apply migrations to Neon**

```bash
DATABASE_URL="<neon-url>" npm run db:migrate
```

Expected: both tables created on Neon.

- [ ] **Step 3: Push to GitHub & import to Vercel** — create a GitHub repo, push, then "Import Project" in Vercel.

- [ ] **Step 4: Set Vercel env vars** — `DATABASE_URL` (Neon), `APP_PASSCODE` (your secret passcode), `AUTH_SECRET` (32+ random chars). Deploy.

- [ ] **Step 5: Verify on desktop** — open the deployed URL, log in with the passcode, add a category + expense, switch months.

- [ ] **Step 6: Verify iOS home-screen install** — open the URL in iOS Safari → Share → "Add to Home Screen" → launch from the icon. Confirm: full-screen (no Safari chrome), content clears the notch/home indicator, login persists across launches, add-expense works.

- [ ] **Step 7: Final commit (if any config changed)**

```bash
git add -A
git commit -m "chore: production deploy config"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** auth/passcode → Tasks 8–10; expenses + per-category monthly budgets → Tasks 4–7, 13–17; browse-by-month → Tasks 3, 7, 13–16; PHP centavos → Tasks 2, 5; monthly overview → Tasks 7, 14; 10 static themes → Task 11; pick-then-build flow → Task 11 checkpoint + Task 12; PWA/iOS install → Tasks 10, 19; manage categories → Task 17; transaction history + edit + delete → Tasks 15–16 (the expense sheet is reused for edit via `editTx`); data model (3 tables) → Task 5. All spec sections map to tasks.

**Placeholder scan:** UI code uses concrete semantic-token classes (defined in Task 10), not "style later." Task 11's theme list shows two complete entries plus an explicit, enumerated list of the remaining eight to fill in the same shape — a design-led task, not a placeholder.

**Type consistency:** `DB`, `CategoryInput`, `ExpenseInput`, `YearMonth`, `Category`, `Transaction`, `ActionResult`, and data-access signatures are used identically across tasks. Form field names (`amount`, `description`, `categoryId`, `occurredOn`, `name`, `emoji`, `color`, `monthlyBudget`, `id`, `passcode`) match between Server Actions (Task 9) and the forms that submit them (Tasks 10, 15, 16, 17).
