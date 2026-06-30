# Monthly Budget + Savings + UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an overall per-month budget (set in Manage), a Savings page that auto-accumulates each past month's leftover, bottom-tab navigation, and UI polish + loading indicators.

**Architecture:** New `monthly_budgets` table + a generated Drizzle migration (the PGlite test DB applies migrations from `./drizzle`, so the migration is required for tests). Pure data-access functions (TDD against PGlite) for budget upsert/get and savings computation. A thin server action wraps budget upsert. UI: dashboard overview switches to the overall budget; new `/savings` page; a bottom tab bar in the root layout; skeleton `loading.tsx` files + a `useLinkStatus`-based top progress bar.

**Tech Stack:** Next.js 16 (App Router), React 19, TS strict, Tailwind v4, Drizzle ORM + Neon/PGlite, Zod, sonner, Vitest.

## Global Constraints

- PHP, integer **centavos**; format only at display via `formatCentavos`. ₱1.00 = 100.
- Mobile-first; inputs ≥16px; respect `env(safe-area-inset-*)`.
- TypeScript strict; no `any` except the documented `PgDatabase<any, typeof schema>` DB type.
- UI references semantic tokens only (Dark Glass values already in `globals.css`); never hardcode colors.
- No `window.confirm`/`alert`.
- Component test files start with `// @vitest-environment jsdom`. Tests: `npx vitest run`.
- **No git commits** for this project (user preference) — skip every commit step.
- Savings semantics: a month is "past" iff `year*12+month` < current; Total Saved = Σ over past months **that have a budget row** of `(budget − spent)`; **net** (overspend subtracts); current month excluded from total.

**Confirmed existing interfaces** (verified, trust them): `formatCentavos(c, {symbol?})`, `parseAmountToCentavos(s): number|null`; `YearMonth`, `getYearMonth`, `shiftMonth`, `formatMonthLabel`, `parseYearMonth`, `monthRange` in `lib/month.ts`; `db` in `lib/db/client.ts`; `DB` in `lib/db/types.ts`; `ActionResult`/`ok`/`fail` in `lib/action-result.ts`; `listCategories`/`getCategoriesWithMonthTotals` data access; `transactions`/`categories` + `Category`/`Transaction` types in `lib/db/schema.ts`. `createTestDb()` in `lib/test/db.ts` boots PGlite and runs `migrate(..., {migrationsFolder: "./drizzle"})`.

---

## Task 1: `monthly_budgets` schema, migration, Zod schema, `monthKey` helper

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/schemas.ts`
- Modify: `lib/month.ts`
- Modify: `lib/__tests__/month.test.ts`
- Generate: `drizzle/0001_*.sql` (via `npm run db:generate`)

**Interfaces:**
- Produces: `monthlyBudgets` table; `MonthlyBudget` type; `budgetSchema`/`BudgetInput`; `monthKey(ym: YearMonth): string` → `"YYYY-MM"`.

- [ ] **Step 1:** Add to `lib/db/schema.ts` — extend the `drizzle-orm/pg-core` import with `unique`, then append:

```ts
export const monthlyBudgets = pgTable(
  "monthly_budgets",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    amount: integer("amount").notNull(), // centavos
  },
  (t) => [unique().on(t.year, t.month)],
);

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudgets.$inferInsert;
```

- [ ] **Step 2:** Add to `lib/schemas.ts`:

```ts
export const budgetSchema = z.object({
  year: z.number().int().min(1970).max(9999),
  month: z.number().int().min(1).max(12),
  amount: z.number().int().min(0),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
```

- [ ] **Step 3:** Add `monthKey` to `lib/month.ts`:

```ts
export function monthKey(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}
```

- [ ] **Step 4:** Add to `lib/__tests__/month.test.ts` (import `monthKey`):

```ts
describe("monthKey", () => {
  it("zero-pads the month", () => expect(monthKey({ year: 2026, month: 6 })).toBe("2026-06"));
  it("handles december", () => expect(monthKey({ year: 2026, month: 12 })).toBe("2026-12"));
});
```

- [ ] **Step 5:** Generate the migration: `npm run db:generate` (no DB connection needed — diffs schema vs `drizzle/meta`). Expected: a new `drizzle/0001_*.sql` creating `monthly_budgets` with the unique constraint.

- [ ] **Step 6:** Verify: `npx vitest run lib/__tests__/month.test.ts` passes; `npx tsc --noEmit` clean.

---

## Task 2: Budget data access (TDD / PGlite)

**Files:**
- Create: `lib/data/budgets.ts`
- Test: `lib/__tests__/budgets.data.test.ts`

**Interfaces:**
- Consumes: `DB`, `YearMonth`, `monthlyBudgets`.
- Produces: `getMonthlyBudget(db, ym): Promise<number|null>`; `setMonthlyBudget(db, ym, amount): Promise<void>` (upsert on (year,month)); `getRecentBudgetBefore(db, ym): Promise<number|null>`.

- [ ] **Step 1: Write failing test** `lib/__tests__/budgets.data.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { getMonthlyBudget, setMonthlyBudget, getRecentBudgetBefore } from "@/lib/data/budgets";
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
});
```

- [ ] **Step 2:** Run `npx vitest run lib/__tests__/budgets.data.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** `lib/data/budgets.ts`:

```ts
import { and, eq, lt, or, desc } from "drizzle-orm";
import { monthlyBudgets } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import type { YearMonth } from "@/lib/month";

export async function getMonthlyBudget(db: DB, ym: YearMonth): Promise<number | null> {
  const [row] = await db
    .select()
    .from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.year, ym.year), eq(monthlyBudgets.month, ym.month)));
  return row ? row.amount : null;
}

export async function setMonthlyBudget(db: DB, ym: YearMonth, amount: number): Promise<void> {
  await db
    .insert(monthlyBudgets)
    .values({ year: ym.year, month: ym.month, amount })
    .onConflictDoUpdate({ target: [monthlyBudgets.year, monthlyBudgets.month], set: { amount } });
}

export async function getRecentBudgetBefore(db: DB, ym: YearMonth): Promise<number | null> {
  const [row] = await db
    .select()
    .from(monthlyBudgets)
    .where(
      or(
        lt(monthlyBudgets.year, ym.year),
        and(eq(monthlyBudgets.year, ym.year), lt(monthlyBudgets.month, ym.month)),
      ),
    )
    .orderBy(desc(monthlyBudgets.year), desc(monthlyBudgets.month))
    .limit(1);
  return row ? row.amount : null;
}
```

- [ ] **Step 4:** Run the test → PASS. `npx tsc --noEmit` clean.

---

## Task 3: Savings data access (TDD / PGlite)

**Files:**
- Create: `lib/data/savings.ts`
- Test: `lib/__tests__/savings.data.test.ts`

**Interfaces:**
- Consumes: `DB`, `YearMonth`, `monthKey`, `monthlyBudgets`, `transactions`, `createCategory` (for FK), `setMonthlyBudget`.
- Produces: `SavingsMonth = { year, month, budget, spent, saved }`; `getSavings(db, currentYm): Promise<{ total: number; months: SavingsMonth[] }>`.

- [ ] **Step 1: Write failing test** `lib/__tests__/savings.data.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/test/db";
import { getSavings } from "@/lib/data/savings";
import { setMonthlyBudget } from "@/lib/data/budgets";
import { createCategory } from "@/lib/data/categories";
import { addExpense } from "@/lib/data/transactions";
import type { DB } from "@/lib/db/types";

let db: DB;
let catId: number;
beforeEach(async () => {
  db = await createTestDb();
  const c = await createCategory(db, { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0 });
  catId = c.id;
});

const cur = { year: 2026, month: 6 };

describe("getSavings", () => {
  it("is zero with no budgets", async () => {
    expect(await getSavings(db, cur)).toEqual({ total: 0, months: [] });
  });

  it("sums leftover of past budgeted months (net), newest first, excluding current and unbudgeted", async () => {
    await setMonthlyBudget(db, { year: 2026, month: 4 }, 1000000); // spent 600000 -> +400000
    await setMonthlyBudget(db, { year: 2026, month: 5 }, 1000000); // spent 1200000 -> -200000 (overspend)
    await setMonthlyBudget(db, { year: 2026, month: 6 }, 1000000); // current month -> excluded
    await addExpense(db, { categoryId: catId, amount: 600000, description: "", occurredOn: "2026-04-10" });
    await addExpense(db, { categoryId: catId, amount: 1200000, description: "", occurredOn: "2026-05-15" });
    await addExpense(db, { categoryId: catId, amount: 999999, description: "", occurredOn: "2026-06-02" });

    const res = await getSavings(db, cur);
    expect(res.total).toBe(200000); // 400000 + (-200000)
    expect(res.months.map((m) => `${m.year}-${m.month}`)).toEqual(["2026-5", "2026-4"]);
    expect(res.months[0]).toMatchObject({ budget: 1000000, spent: 1200000, saved: -200000 });
    expect(res.months[1]).toMatchObject({ budget: 1000000, spent: 600000, saved: 400000 });
  });

  it("excludes a past month with transactions but no budget", async () => {
    await addExpense(db, { categoryId: catId, amount: 500000, description: "", occurredOn: "2026-03-10" });
    expect(await getSavings(db, cur)).toEqual({ total: 0, months: [] });
  });
});
```

- [ ] **Step 2:** Run → FAIL (module not found).

- [ ] **Step 3: Implement** `lib/data/savings.ts`:

```ts
import { sql } from "drizzle-orm";
import { monthlyBudgets, transactions } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { monthKey, type YearMonth } from "@/lib/month";

export interface SavingsMonth {
  year: number;
  month: number;
  budget: number;
  spent: number;
  saved: number;
}

export async function getSavings(
  db: DB,
  currentYm: YearMonth,
): Promise<{ total: number; months: SavingsMonth[] }> {
  const budgets = await db.select().from(monthlyBudgets);
  const sums = await db
    .select({
      period: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)::int`,
    })
    .from(transactions)
    .groupBy(sql`to_char(${transactions.occurredOn}, 'YYYY-MM')`);

  const spentByKey = new Map(sums.map((s) => [s.period, Number(s.total)]));
  const cur = currentYm.year * 12 + currentYm.month;

  const months: SavingsMonth[] = budgets
    .filter((b) => b.year * 12 + b.month < cur)
    .map((b) => {
      const spent = spentByKey.get(monthKey({ year: b.year, month: b.month })) ?? 0;
      return { year: b.year, month: b.month, budget: b.amount, spent, saved: b.amount - spent };
    })
    .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month));

  const total = months.reduce((acc, m) => acc + m.saved, 0);
  return { total, months };
}
```

- [ ] **Step 4:** Run → PASS. `npx tsc --noEmit` clean.

---

## Task 4: Budget server action

**Files:**
- Create: `app/actions/budget.ts`

**Interfaces:**
- Consumes: `db`, `budgetSchema`, `parseAmountToCentavos`, `setMonthlyBudget`, `ok`/`fail`/`ActionResult`.
- Produces: `setMonthlyBudgetAction(prev: ActionResult, form: FormData): Promise<ActionResult>` (form fields `year`, `month`, `amount`).

- [ ] **Step 1: Implement** `app/actions/budget.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { budgetSchema } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { setMonthlyBudget } from "@/lib/data/budgets";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function setMonthlyBudgetAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const amount = parseAmountToCentavos(String(form.get("amount") ?? ""));
  const parsed = budgetSchema.safeParse({
    year: Number(form.get("year")),
    month: Number(form.get("month")),
    amount: amount ?? -1,
  });
  if (!parsed.success) return fail("Enter a valid budget amount");
  await setMonthlyBudget(db, { year: parsed.data.year, month: parsed.data.month }, parsed.data.amount);
  revalidatePath("/");
  revalidatePath("/savings");
  revalidatePath("/categories");
  return ok();
}
```

- [ ] **Step 2:** `npx tsc --noEmit` clean.

---

## Task 5: Budget form + Manage page integration

**Files:**
- Create: `components/budget-form.tsx`
- Modify: `app/categories/page.tsx`

**Interfaces:**
- Consumes: `setMonthlyBudgetAction`, `formatCentavos`, `getMonthlyBudget`/`getRecentBudgetBefore`, `parseYearMonth`/`getYearMonth`/`formatMonthLabel`, `logoutAction`, `CategoryManager`.

- [ ] **Step 1: Implement** `components/budget-form.tsx` (client) — fields: hidden `year`/`month`, decimal `amount` prefilled, Save button with pending state; toast + `router.refresh()` on success:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setMonthlyBudgetAction } from "@/app/actions/budget";
import { formatCentavos } from "@/lib/money";

export function BudgetForm({
  year, month, label, currentAmount, suggested,
}: {
  year: number; month: number; label: string;
  currentAmount: number | null; suggested: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const prefill =
    currentAmount != null ? formatCentavos(currentAmount, { symbol: false })
    : suggested != null ? formatCentavos(suggested, { symbol: false })
    : "";

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await setMonthlyBudgetAction({ ok: true }, fd);
          if (res.ok) { toast.success("Budget saved"); router.refresh(); }
          else toast.error(res.error);
        })
      }
      className="surface space-y-3 p-4"
    >
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Monthly budget</h2>
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <div className="flex gap-2">
        <input
          name="amount" inputMode="decimal" defaultValue={prefill} placeholder="0.00"
          className="surface w-full px-4 py-3 text-xl outline-none"
        />
        <button
          type="submit" disabled={pending}
          className="rounded-[var(--radius)] bg-accent px-5 font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {currentAmount == null && suggested != null && (
        <p className="text-muted-foreground text-xs">Prefilled from last month — Save to apply.</p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Modify** `app/categories/page.tsx` to accept `?y=&m=`, render the budget form, keep logout, drop the back link (bottom nav handles it):

```tsx
import { db } from "@/lib/db/client";
import { listCategories } from "@/lib/data/categories";
import { getMonthlyBudget, getRecentBudgetBefore } from "@/lib/data/budgets";
import { getYearMonth, parseYearMonth, formatMonthLabel } from "@/lib/month";
import { CategoryManager } from "@/components/category-manager";
import { BudgetForm } from "@/components/budget-form";
import { logoutAction } from "@/app/actions/auth";

export default async function CategoriesPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const sp = await searchParams;
  const ym = parseYearMonth(sp.y, sp.m, getYearMonth(new Date()));
  const [categories, currentAmount, suggested] = await Promise.all([
    listCategories(db),
    getMonthlyBudget(db, ym),
    getRecentBudgetBefore(db, ym),
  ]);

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage</h1>
        <form action={logoutAction}><button className="text-muted-foreground text-sm">Log out</button></form>
      </div>
      <BudgetForm
        year={ym.year} month={ym.month} label={formatMonthLabel(ym)}
        currentAmount={currentAmount} suggested={suggested}
      />
      <div className="space-y-3">
        <h2 className="font-semibold">Categories</h2>
        <CategoryManager categories={categories} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3:** `npx tsc --noEmit` clean.

---

## Task 6: Dashboard overview uses the monthly budget

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getCategoriesWithMonthTotals`, `getMonthlyBudget`, `getYearMonth`/`parseYearMonth`/`formatMonthLabel`, `formatCentavos`, `MonthSwitcher`, `BudgetBar`, `CategoryCard`, `DashboardClient`, `ensureSeedCategories`.

- [ ] **Step 1: Modify** `app/page.tsx` — replace the overview section to use the overall monthly budget; compute spent from category rows; show a "Set a monthly budget" link to `/categories?y=&m=` when no budget. Remove the always-on "Manage" link (bottom nav covers it). Full file:

```tsx
import Link from "next/link";
import { db } from "@/lib/db/client";
import { getCategoriesWithMonthTotals } from "@/lib/data/overview";
import { getMonthlyBudget } from "@/lib/data/budgets";
import { getYearMonth, parseYearMonth } from "@/lib/month";
import { formatCentavos } from "@/lib/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar } from "@/components/budget-bar";
import { CategoryCard } from "@/components/category-card";
import { DashboardClient } from "@/components/dashboard-client";
import { ensureSeedCategories } from "@/lib/data/seed";

export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const sp = await searchParams;
  const ym = parseYearMonth(sp.y, sp.m, getYearMonth(new Date()));

  await ensureSeedCategories(db);

  const [rows, budget] = await Promise.all([
    getCategoriesWithMonthTotals(db, ym),
    getMonthlyBudget(db, ym),
  ]);
  const spent = rows.reduce((acc, r) => acc + r.spent, 0);
  const categories = rows.map((r) => r.category);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-6">
      <MonthSwitcher ym={ym} basePath="/" />

      <section className="surface p-5">
        <div className="text-muted-foreground text-sm">Spent this month</div>
        <div className="mt-1 text-4xl font-semibold tracking-tight">{formatCentavos(spent)}</div>
        {budget != null ? (
          <div className="mt-4 space-y-2">
            <BudgetBar spent={spent} budget={budget} />
            <div className="text-muted-foreground text-sm">
              {budget - spent >= 0
                ? `${formatCentavos(budget - spent)} left of ${formatCentavos(budget)}`
                : `${formatCentavos(spent - budget)} over ${formatCentavos(budget)}`}
            </div>
          </div>
        ) : (
          <Link
            href={`/categories?y=${ym.year}&m=${ym.month}`}
            className="text-accent mt-3 inline-block text-sm"
          >
            Set a monthly budget →
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Categories</h2>
        {rows.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No categories yet. Add one in Manage.
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

- [ ] **Step 2:** `npx tsc --noEmit` clean.

---

## Task 7: Savings page

**Files:**
- Create: `app/savings/page.tsx`

**Interfaces:**
- Consumes: `getSavings`, `getMonthlyBudget`, `getCategoriesWithMonthTotals` (for current spent), `getYearMonth`/`formatMonthLabel`, `formatCentavos`.

- [ ] **Step 1: Implement** `app/savings/page.tsx` (server). Total saved (big), current-month projection (not yet banked), and a newest-first history list. Apply Dark Glass polish:

```tsx
import { db } from "@/lib/db/client";
import { getSavings } from "@/lib/data/savings";
import { getMonthlyBudget } from "@/lib/data/budgets";
import { getCategoriesWithMonthTotals } from "@/lib/data/overview";
import { getYearMonth, formatMonthLabel } from "@/lib/month";
import { formatCentavos } from "@/lib/money";

export default async function SavingsPage() {
  const now = getYearMonth(new Date());
  const [{ total, months }, currentBudget, rows] = await Promise.all([
    getSavings(db, now),
    getMonthlyBudget(db, now),
    getCategoriesWithMonthTotals(db, now),
  ]);
  const currentSpent = rows.reduce((acc, r) => acc + r.spent, 0);
  const projected = currentBudget != null ? currentBudget - currentSpent : null;

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-28 pt-6">
      <h1 className="text-2xl font-semibold">Savings</h1>

      <section className="surface p-5 text-center">
        <div className="text-muted-foreground text-sm">Total saved</div>
        <div className="text-accent mt-1 text-4xl font-semibold tracking-tight">{formatCentavos(total)}</div>
      </section>

      {projected != null && (
        <section className="surface p-4">
          <div className="text-muted-foreground text-sm">This month ({formatMonthLabel(now)})</div>
          <div className={`mt-1 text-2xl font-semibold ${projected >= 0 ? "" : "text-danger"}`}>
            {formatCentavos(projected)}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Projected — banks when the month ends.</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-muted-foreground text-sm font-medium">History</h2>
        {months.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No completed budgeted months yet. Set a budget and it banks when the month ends.
          </p>
        )}
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="surface flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{formatMonthLabel({ year: m.year, month: m.month })}</div>
              <div className="text-muted-foreground text-xs">
                {formatCentavos(m.spent)} of {formatCentavos(m.budget)}
              </div>
            </div>
            <div className={`font-semibold ${m.saved >= 0 ? "text-accent" : "text-danger"}`}>
              {m.saved >= 0 ? "+" : "−"}{formatCentavos(Math.abs(m.saved))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 2:** `npx tsc --noEmit` clean.

---

## Task 8: Bottom tab navigation + layout wiring

**Files:**
- Create: `components/bottom-nav.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/fab.tsx`

**Interfaces:**
- Produces: `<BottomNav/>` (client) rendered globally; hidden on `/login` and `/themes`. FAB sits above it.

- [ ] **Step 1: Implement** `components/bottom-nav.tsx` (client) — three tabs, active in accent, hidden on auth/gallery routes, frosted, above safe area:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/savings", label: "Savings", icon: "🐖" },
  { href: "/categories", label: "Manage", icon: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/themes")) return null;

  return (
    <nav className="surface fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Modify** `app/layout.tsx` — render `<BottomNav/>` (and `<RouteProgress/>` from Task 9) inside `<body>`, update `themeColor` to Dark Glass:

```tsx
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget Tracker",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Budget" },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh safe-top">
        <RouteProgress />
        {children}
        <BottomNav />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Modify** `components/fab.tsx` — raise it above the nav bar: change `bottom-[calc(env(safe-area-inset-bottom)+1.25rem)]` to `bottom-[calc(env(safe-area-inset-bottom)+5rem)]`.

- [ ] **Step 4:** `npx tsc --noEmit` clean.

---

## Task 9: Loading indicators — skeletons + top progress bar

**Files:**
- Create: `components/skeleton.tsx`
- Create: `app/loading.tsx`, `app/savings/loading.tsx`, `app/category/[id]/loading.tsx`
- Create: `components/route-progress.tsx`
- Modify: `app/globals.css` (shimmer + progress keyframes)

**Interfaces:**
- Produces: `<Skeleton/>` primitive; route-level skeleton fallbacks; `<RouteProgress/>` top bar driven by `useLinkStatus`.

- [ ] **Step 1: Add to `app/globals.css`** (after existing rules):

```css
@keyframes shimmer { 100% { transform: translateX(100%); } }
.skeleton {
  position: relative; overflow: hidden;
  background: var(--muted); border-radius: var(--radius);
}
.skeleton::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  animation: shimmer 1.4s infinite;
}
@keyframes progress-grow { 0% { width: 0; } 90% { width: 90%; } 100% { width: 90%; } }
.route-progress {
  position: fixed; top: 0; left: 0; height: 2px; z-index: 60;
  background: var(--accent); animation: progress-grow 1.2s ease-out forwards;
}
```

- [ ] **Step 2: Implement** `components/skeleton.tsx`:

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
```

- [ ] **Step 3: Implement** `app/loading.tsx` (mirrors dashboard shape):

```tsx
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-28 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Implement** `app/savings/loading.tsx`:

```tsx
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-28 pt-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-20 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Implement** `app/category/[id]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-6">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Implement** `components/route-progress.tsx` — a top bar shown while a `<Link>` navigation is pending. Per Next 16 docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`), `useLinkStatus` from `next/link` must be rendered inside a `<Link>`. Render an invisible status-tracking child inside each bottom-nav link instead, OR a standalone bar component used by the nav. Implementation: a `NavLinkProgress` child placed inside each `BottomNav` `<Link>`:

```tsx
"use client";

import { useLinkStatus } from "next/link";

export function RouteProgress() {
  // Global mount point is a no-op; the actual bar renders via NavLinkProgress
  // inside each Link (useLinkStatus only works as a Link descendant).
  return null;
}

export function NavLinkProgress() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="route-progress" />;
}
```

Then in `components/bottom-nav.tsx`, import `NavLinkProgress` and render `{active ? null : <NavLinkProgress />}` (or always) inside each `<Link>` so tapping a tab shows the top bar until the destination's `loading.tsx`/content is ready. (Keep `RouteProgress` in the layout as the documented mount point; it renders nothing itself.)

- [ ] **Step 7:** `npx tsc --noEmit` clean; `npx vitest run` all green.

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1:** `npx vitest run` → all green (foundation + new budget/savings/month tests).
- [ ] **Step 2:** `npx tsc --noEmit` → clean.
- [ ] **Step 3:** Controller applies the new migration to Neon (`set -a; . ./.env.local; set +a; npm run db:migrate`) and verifies in-browser: set a budget in Manage → dashboard overview shows Budget/Remaining; bottom nav switches Home/Savings/Manage; Savings page renders; skeletons flash on navigation. Do NOT run `npm run build` while the dev server is running.

---

## Self-Review

**Spec coverage:** monthly budget table+access (T1–T2), savings calc (T3), set-budget action (T4), Manage budget input with prefill (T5), dashboard overview uses overall budget (T6), savings page (T7), bottom nav (T8), skeleton loaders + top progress bar (T9), verification + Neon migrate (T10). All spec sections mapped.

**Placeholder scan:** All steps contain concrete code or concrete commands. The top-progress-bar (T9 S6) names the exact doc path and the exact API constraint; no vague "add a loader."

**Type consistency:** `YearMonth`, `MonthlyBudget`, `SavingsMonth`, `ActionResult`, `getMonthlyBudget/setMonthlyBudget/getRecentBudgetBefore`, `getSavings`, `setMonthlyBudgetAction`, `monthKey` used identically across tasks. Form field names (`year`, `month`, `amount`) match between `setMonthlyBudgetAction` and `BudgetForm`. `getCategoriesWithMonthTotals` reused for current-month spent in both dashboard and savings.
