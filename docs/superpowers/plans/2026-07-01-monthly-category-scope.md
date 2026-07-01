# Monthly Category Scope — Implementation Plan

**Goal:** categories can be permanent (every month) or temporary (one specific month). Additive, backward-compatible.

**Spec:** docs/superpowers/specs/2026-07-01-monthly-category-scope-design.md

## Global constraints
- Additive & backward-compatible: new columns are **nullable**, existing rows = permanent (null scope).
- IDs are uuid strings (unchanged). Money is integer centavos. TS strict. Apple Liquid Glass theme, inputs ≥16px.
- Dexie is source of truth; pages are client-rendered reading via `useLiveQuery`.
- No git commit, no `db:migrate`, no `npm run build`, no dev server by the implementer.
- End `npx tsc --noEmit` clean and `npx vitest run` all green.

## Work items

### 1. Schema + migration + shared types
- `lib/db/schema.ts`: add to `categories` → `scopeYear: integer("scope_year")` (nullable), `scopeMonth: integer("scope_month")` (nullable).
- Hand-write `drizzle/0005_category_scope.sql`: `ALTER TABLE "categories" ADD COLUMN "scope_year" integer;` and `... "scope_month" integer;` (each on its own statement, `--> statement-breakpoint` between). Register via `db:generate --custom --name category_scope`, then verify the migration applies on a fresh PGlite DB (the test helper runs all migrations). Regenerate `drizzle/meta/0005_snapshot.json` so it matches the new schema (diffs empty).
- `lib/local/types.ts`: add `scopeYear: number | null; scopeMonth: number | null;` to the local Category type.
- `lib/schemas.ts`: add the two nullable fields to the category **row** schema used by sync.
- `lib/server/sync.ts`: include `scopeYear`/`scopeMonth` in the category upsert insert + update sets.
- Dexie (`lib/local/db.ts`): no version bump needed (non-indexed fields).

### 2. Data layer — scope + month-aware filtering
- `lib/local/data/categories.ts`:
  - `createCategory` accepts optional `scope?: { year: number; month: number }` → sets `scopeYear`/`scopeMonth` (else null/null). Keep existing callers working (default permanent).
  - Add `visibleInMonth(category, ym)` helper: `category.scopeYear == null || (category.scopeYear === ym.year && category.scopeMonth === ym.month)`.
  - Add `listCategoriesForMonth(ym)` → active (non-deleted, non-archived) categories filtered by `visibleInMonth`, same ordering as `listCategories` (sortOrder, then createdAt).
  - Keep `listCategories()` (all) for id lookups.
- `lib/local/data/overview.ts` (`getCategoriesWithMonthTotals(ym)`): filter to `visibleInMonth(category, ym)` so the dashboard list + Allocated total only include permanent + this-month temporary categories.
- Expense-sheet category picker + Manage list: use the month-aware list for the current ym. (Category detail lookup by id stays on the all-categories list so a temp category still resolves in its own month.)

### 3. UI — Add-category toggle + temporary badge
- `components/category-manager.tsx`: the **Add category** form gains an "Applies to" radio/segmented control: "Every month" (default) vs "Only {monthLabel}". Requires the current `ym` (+ a month label) as a prop. On submit temporary → pass `scope: { year, month }` to `createCategory`.
- `app/categories/page.tsx`: pass `ym` (and `formatMonthLabel(ym)`) to `CategoryManager`; the Manage category list uses `listCategoriesForMonth(ym)`.
- Category cards (home `category-card.tsx` and/or the Manage list rows): show a subtle "This month" pill when `scopeYear != null`. Keep Apple Liquid Glass styling.
- `app/page.tsx` dashboard already gets its rows from `getCategoriesWithMonthTotals(ym)` — inherits the filter automatically.

### 4. Tests
- `createCategory` with a scope stores `scopeYear`/`scopeMonth`; without → null/null.
- `visibleInMonth` / `listCategoriesForMonth`: a temp category shows in its month, hides in other months; permanent shows in all.
- `getCategoriesWithMonthTotals` excludes other-month temporaries (and their budget from Allocated).
- Sync round-trips the new fields (server upsert + pull) — extend `server-sync.test.ts`.
- Migration `0005` applies on a fresh PGlite DB (covered by the migrate-running tests).

## Verify
`npx tsc --noEmit` clean; `npx vitest run` all green. Report which tests cover the new logic.
