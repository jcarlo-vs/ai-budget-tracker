# Monthly Budget + Savings + UI Polish — Design

**Date:** 2026-06-30
**Builds on:** the existing budget tracker (passcode auth, per-category monthly budgets, browse-by-month, PHP centavos, Dark Glass theme).

## Goal

Add an **overall monthly budget** (set in Manage), a **Savings** page that automatically
accumulates each past month's leftover, a proper **bottom tab navigation**, and a round of
**UI polish + loading indicators**.

## Global constraints (inherited)

- PHP, stored/computed as integer **centavos**; format only at display via `formatCentavos`.
- Mobile-first; inputs ≥16px; respect `env(safe-area-inset-*)`.
- TypeScript strict, no `any` (except documented Drizzle `PgDatabase` param).
- Theme-independent UI via semantic tokens (Dark Glass values live in `globals.css`).
- No `window.confirm`/`alert`.
- Tests: `npx vitest run`; component test files start with `// @vitest-environment jsdom`.

---

## 1. Data model

New table **`monthly_budgets`** — one row per month that has a budget set:

```
monthly_budgets:
  id        serial primary key
  year      integer not null
  month     integer not null        -- 1..12
  amount    integer not null        -- centavos
  unique (year, month)
```

Per-category budgets (`categories.monthlyBudget`) are **unchanged** and remain optional
(a category with budget 0 shows no per-category bar). The new overall budget is separate
and is the dashboard headline.

---

## 2. Monthly budget

**Data access** (`lib/data/budgets.ts`):
- `getMonthlyBudget(db, ym): Promise<number | null>` — amount for that month, or null.
- `setMonthlyBudget(db, ym, amount): Promise<void>` — upsert on (year, month).
- `getRecentBudgetBefore(db, ym): Promise<number | null>` — most recent budget strictly
  before `ym`, for the Manage prefill default.

**Server action** (`app/actions/budget.ts`):
- `setMonthlyBudgetAction(prev, form)` — reads `year`, `month`, `amount`
  (`parseAmountToCentavos`); validates with Zod (year 1970–9999, month 1–12, amount ≥ 0);
  upserts; `revalidatePath("/")`, `"/savings"`, `"/categories"`. Returns `ActionResult`.

**Manage page** (`/categories`, now accepts `?y=&m=`, default current month):
- New top section "Monthly budget for `<Month Year>`": a text input (decimal) + Save.
- Prefilled value: the month's own budget if set, else `getRecentBudgetBefore` (display
  only — only persisted on Save). Placeholder makes clear when nothing is set yet.
- Submits to `setMonthlyBudgetAction` with hidden `year`/`month`; toast + refresh on success.

**Dashboard overview** (viewed month):
- Shows **Budget**, **Spent**, **Remaining = budget − spent**; progress bar = spent/budget
  (danger when over). If no budget set for the month: show spent + a "Set a monthly budget"
  link to `/categories?y=&m=` instead of a bar.

---

## 3. Savings (new `/savings` page)

Computed on read — no background job.

**Definition:**
- A month `(y,m)` is **past** if it is strictly before the current real month
  (compare `year*12 + month`).
- **Total saved = Σ over every past month that has a `monthly_budgets` row of
  (budget − spentThatMonth).** Net accounting: an overspent month contributes a negative
  value (Total Saved stays honest). Months with no budget row are excluded entirely.
- The **current month** is never in the total; it is shown separately as a projection.

**Data access** (`lib/data/savings.ts`):
- `getSavings(db, currentYm): Promise<{ total: number; months: SavingsMonth[] }>` where
  `SavingsMonth = { year, month, budget, spent, saved }`, `saved = budget − spent`,
  list covers past months that have a budget, newest first.
- Implementation: read all `monthly_budgets`; for the past ones, sum transaction amounts
  per month (grouped query on `occurred_on`); join.

**Page shows:**
- **Total saved** (large, accent).
- **This month (projected, not yet banked):** `currentBudget − currentSpent` if a current
  budget exists, with a "banks when the month ends" note.
- **History list:** each past month with budget → Budget · Spent · Saved (green/red),
  newest first. Empty state when there are no completed budgeted months yet.

---

## 4. Navigation — bottom tab bar

- `components/bottom-nav.tsx` (client): three tabs **Dashboard (/)** · **Savings (/savings)**
  · **Manage (/categories)**, icons + labels, active tab in accent (`usePathname`).
- Fixed to the bottom, above `env(safe-area-inset-bottom)`, frosted `.surface`.
- Rendered in the root layout but **hidden on `/login` and `/themes`** (return null for
  those paths). Page content gets bottom padding so the bar never overlaps.
- The standalone "Manage"/"← Back" links are removed in favor of the tab bar (the dashboard
  overview keeps a contextual "set budget" link only when no budget is set). The FAB stays.

---

## 5. UI polish + loading

**Polish (keep Dark Glass):** tighten type scale, spacing and card hierarchy; animated
progress bars (width transition); refined empty states; larger tap targets; consistent
section headers across Dashboard / Savings / Manage.

**Loading indicators:**
- Route-level **skeleton** loaders: `app/loading.tsx`, `app/savings/loading.tsx`,
  `app/category/[id]/loading.tsx` — shimmer placeholders matching each page's shape (shown
  via App Router Suspense while server data loads).
- A slim **top progress bar** during route transitions: `components/route-progress.tsx`
  (client). Implementation chosen against the installed Next 16 API (e.g. `useLinkStatus`
  on nav links, or an animated bar keyed off `usePathname`); no new heavy dependency unless
  trivial. Reference `node_modules/next/dist/docs/` before implementing.
- Keep existing in-form pending states (expense "Saving…"); add the same to the budget form.

---

## 6. Testing

- `lib/data/budgets` — upsert/get/recent-before (PGlite).
- `lib/data/savings` — past-months sum; excludes current month; excludes no-budget months;
  overspend yields negative contribution; newest-first ordering (PGlite).
- Any new pure helper (e.g. month-compare) — unit tested.
- Component tests where there is logic (e.g. overview "no budget" branch, savings row).
- Full suite green + `tsc --noEmit` clean before done.

## Out of scope (YAGNI)

- Spending the savings / transferring out / adjusting the pot manually.
- Rolling savings into next month's budget.
- Per-category budgets UI changes beyond what already exists.
- Deploy (separate task).
