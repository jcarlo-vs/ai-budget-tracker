# Monthly Category Scope — Design

**Goal:** A category on the Manage page can be **permanent** (shows every month, current behavior) or **temporary** (shows only one specific month).

## Data model
Add two nullable columns to `categories`:
- `scopeYear` (int, nullable)
- `scopeMonth` (int, nullable, 1..12)

Rules:
- `scopeYear IS NULL` (both null) → **permanent** (every month).
- `scopeYear = Y AND scopeMonth = Mo` → **temporary**, visible only in that month.

Existing categories have null scope → automatically permanent. No visible change to today's view.

## Filtering (which categories appear for month {Y, Mo})
```
include a category IF  scopeYear IS NULL
                  OR  (scopeYear = Y AND scopeMonth = Mo)
```
Applies to: the dashboard category list + Allocated total, the Manage list, and the expense-sheet category picker. A plain "all categories" lookup is still used for resolving a category by id (detail page).

## UI
The Manage page already has a month switcher. The **Add category** form gains an "Applies to" choice:
- ◯ Every month (permanent) — default
- ◉ Only {current Manage month} (temporary) → stores `scopeYear`/`scopeMonth` = the selected month.

A small "This month" badge marks temporary category cards so they're distinguishable.

## Behavior
- A temporary category has **full parity** in its month: budget, Mark-Paid, itemized expenses, counts toward that month's Allocated.
- Permanent categories keep **one budget across all months** (unchanged).
- Temporary categories remain visible in their own month forever (history); they simply don't appear in other months.

## Rollout
Migration `0005` **adds two nullable columns** — backward-compatible (old code ignores them). Order: run `db:migrate`, then deploy. Low risk (no coordinated cutover like the UUID change).

## Non-goals (YAGNI)
- Multi-month temporary ranges (temporary = exactly one month).
- Per-month budget overrides for permanent categories (separate, bigger feature).

## Sync
The two new fields flow through `/api/sync` like any other column: add them to the category row schema (`lib/schemas.ts`), the local type (`lib/local/types.ts`), and the server upsert (`lib/server/sync.ts`). Dexie needs no version bump (the fields are non-indexed).
