# Budget Tracker — Design Spec

**Date:** 2026-06-30
**Status:** Approved (design), pending implementation plan
**Owner:** Juan Carlo Senin

---

## 1. Overview

A personal, mobile-first budget tracker. The user creates custom spending
categories with monthly budget limits, taps a **"+"** button to log an expense
(amount + description) into a category, and sees per-category totals accumulate.
Tapping a category opens its transaction history for the selected month. The app
browses month by month and shows a simple monthly overview.

The app is **single-user** (just the owner), protected by a passcode. It is built
as a **PWA** so it can be added to the iOS Safari home screen and feel like a
native mobile app (full-screen, no browser chrome) — avoiding App Store cost and
review.

### Goals
- Dead-simple expense logging in 2–3 taps from open → saved.
- See, per category, how much was spent this month vs the budget.
- Browse previous months without losing history.
- Feel native on iOS via home-screen install.

### Non-goals (v1 / YAGNI)
- Multi-user accounts, sharing, roles.
- Income tracking, transfers, multi-account/wallets.
- Bank sync / imports / receipts / OCR.
- Recurring transactions, reminders, notifications.
- Per-month budget overrides (v1 uses one budget per category for all months).
- In-app live theme switching (theme is chosen once from `/themes`, then baked in).
- Multi-currency (PHP only).

---

## 2. Confirmed Decisions

| Decision | Choice |
|---|---|
| Access / auth | Single user, one passcode gate (env var) |
| Tracking scope | Expenses + monthly budget limit per category |
| Monthly model | Browse by month, default = current month, history preserved |
| Currency | PHP (₱), amounts stored as integer centavos |
| v1 extras | Simple monthly overview (total spent vs budget, per-category bars) |
| Themes flow | 10 **static** mockups at `/themes` → user picks one → app built in that theme |
| Stack | Next.js (App Router) + Server Actions + Drizzle ORM + Neon Postgres |
| Hosting | Vercel (free tier), Neon connection via env var |

---

## 3. Tech Stack

- **Framework:** Next.js (App Router), fullstack. React Server Components for
  reads; **Server Actions** for all mutations (no separate REST API).
- **Database:** Neon Postgres (serverless).
- **DB access:** Drizzle ORM via Neon's serverless HTTP driver
  (`@neondatabase/serverless` + `drizzle-orm`). Migrations via `drizzle-kit`.
- **Validation:** Zod schemas shared by forms and Server Actions.
- **Styling:** Tailwind CSS (utility-first; supports the wide visual range needed
  for the themed final build).
- **Deploy:** Vercel. Env vars: `DATABASE_URL`, `APP_PASSCODE`, `AUTH_SECRET`.

Rationale: minimal boilerplate, end-to-end type safety from DB to UI, and good
serverless cold-start behavior. (Alternatives considered: REST + Prisma — more
boilerplate, heavier cold starts; raw SQL — loses type safety. Both rejected.)

---

## 4. Architecture

### 4.1 Auth (passcode gate)
- A single passcode stored in `APP_PASSCODE` (env var). No user table.
- `/login` page: user enters passcode → Server Action verifies → sets a **signed,
  HTTP-only cookie** (signed with `AUTH_SECRET`).
- **Middleware** protects all app routes; unauthenticated requests redirect to
  `/login`. Cookie has a long-ish expiry (e.g. 30 days) so the home-screen app
  rarely re-prompts.
- `/logout` clears the cookie.

### 4.2 PWA / "feels native"
- `app/manifest.ts` (web app manifest): name, short_name, `display: "standalone"`,
  `theme_color`, `background_color`, icons (192/512 + maskable).
- Apple-specific `<meta>` / `<link>`: `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`.
- Viewport: `viewport-fit=cover`; layout respects `env(safe-area-inset-*)` so
  content clears the notch and home indicator.
- Disable accidental zoom on inputs (16px+ font on inputs).
- Service worker / offline is **optional** and out of v1 scope (manifest + Apple
  meta is enough for a polished home-screen install).

### 4.3 Money handling
- All amounts stored as **integer centavos** (₱1.00 → `100`) to avoid float
  rounding bugs. Formatting to `₱1,250.00` happens only at display time.

---

## 5. Data Model

Three tables.

### `categories`
| column | type | notes |
|---|---|---|
| id | uuid / serial PK | |
| name | text, not null | e.g. "Groceries" |
| emoji | text | icon shown on the card, e.g. "🛒" |
| color | text | accent/hex for the card & progress bar |
| monthly_budget | integer (centavos), not null, default 0 | limit applied to every month |
| sort_order | integer, default 0 | manual ordering on the dashboard |
| archived | boolean, default false | hide without deleting (optional in v1) |
| created_at | timestamptz, default now() | |

### `transactions`
| column | type | notes |
|---|---|---|
| id | uuid / serial PK | |
| category_id | FK → categories.id, on delete cascade | |
| amount | integer (centavos), not null | the expense amount |
| description | text | free text |
| occurred_on | date, not null | the date the expense happened (drives month grouping) |
| created_at | timestamptz, default now() | |

Notes:
- Month grouping/filtering is by `occurred_on` (a date), so an expense always
  lands in the month it happened, regardless of when it was entered.
- Deleting a category cascades its transactions (confirmed via dialog).
  Alternatively the user can **archive** a category to keep history.

---

## 6. Screens & Routes

All app routes are behind the passcode middleware except `/login`.

| Route | Purpose |
|---|---|
| `/login` | Passcode entry. |
| `/` | **Dashboard** for the selected month (default = current). |
| `/category/[id]` | Category detail + transaction history for the selected month. |
| `/categories` | Manage categories (create / edit / delete / reorder). |
| `/themes` | **Static** gallery of the 10 design mockups (selection reference). |

### 6.1 Dashboard (`/`)
- **Month switcher** at top: `← June 2026 →` (default current month; can page back
  and forward; "today" shortcut).
- **Monthly overview card:** total spent this month, total budget (sum of category
  budgets), remaining, and an overall progress indicator.
- **Category list:** one card per category showing emoji, name, this-month total,
  and a **budget progress bar** (spent vs `monthly_budget`, with over-budget state).
- **Floating "+" button:** opens the Add Expense sheet.

### 6.2 Add Expense (bottom sheet / modal)
- Fields: **amount** (numeric keypad), **description**, **category** picker
  (pre-selected when opened from a category page), **date** (default today).
- Save → Server Action writes the transaction → totals revalidate/update.

### 6.3 Category detail (`/category/[id]`)
- Header: emoji + name, this-month total, budget bar.
- **Transaction history** list for the selected month: each row shows description,
  amount, and date; edit / delete available (swipe or long-press → actions).
- A "+" scoped to this category (pre-selects it in the Add Expense sheet).

### 6.4 Manage categories (`/categories`)
- List of categories with create / edit / delete. Editing sets name, emoji, color,
  and `monthly_budget`. A few suggested starter categories are offered on first run
  (all editable/deletable).

---

## 7. Server Actions (mutations)

- `login(passcode)` / `logout()`
- `createCategory({ name, emoji, color, monthlyBudget })`
- `updateCategory(id, { ... })`
- `deleteCategory(id)` (cascade transactions, confirmed) / archive variant
- `addExpense({ categoryId, amount, description, occurredOn })`
- `updateExpense(id, { ... })`
- `deleteExpense(id)`

Reads (Server Components / query helpers):
- `getMonthOverview(year, month)` → totals (spent, budget, remaining).
- `getCategoriesWithMonthTotals(year, month)` → cards data.
- `getCategoryTransactions(categoryId, year, month)` → history rows.

Every mutation validates input with Zod and returns typed success/error; the UI
shows inline field errors and a toast on failure.

---

## 8. The 10 Themes (`/themes`)

A static gallery; each is a self-contained mockup of the dashboard (and a category
card) so the look can be judged at a glance. All are mobile-first.

1. **Minimal Mono** — white, generous whitespace, one accent color, system font.
2. **Dark Glass** — dark background, frosted/blurred cards (glassmorphism), neon accent.
3. **Neumorphic Soft** — soft extruded cards, pastel palette, subtle shadows.
4. **iOS Native** — Apple Wallet/Settings feel: grouped inset lists, system blue, SF-like type.
5. **Playful Candy** — vibrant gradients, big emoji, rounded, fun.
6. **Brutalist** — bold borders, high contrast, monospace, raw blocks.
7. **Warm Earthy** — beige / terracotta / sage, cozy, serif headings.
8. **Fintech Pro** — dark navy + green, data-dense dashboard (Revolut/Monzo vibe).
9. **Aurora Gradient** — colorful gradient backgrounds with glass cards, modern.
10. **Retro Terminal** — amber/green-on-black, monospace, CRT/pixel aesthetic.

After the user picks one, the entire app is implemented in that single theme.

---

## 9. Error Handling & Validation
- Zod validation on all inputs (amount > 0, description length, valid date,
  required category). Inline field errors + toast on action failure.
- Money parsed/stored as integer centavos; display formatting centralized in one
  helper to keep ₱ formatting consistent.
- Auth failures redirect to `/login`; invalid passcode shows an inline error.

---

## 10. Testing
Proportionate to a personal app:
- **Unit:** money helpers (parse/format centavos), budget math (spent/remaining/
  over-budget), month range computation, Zod schemas.
- **Integration:** add-expense action and create-category action against a test DB
  (happy path + a validation failure each).

---

## 11. Build Sequence (milestones)
1. **Scaffold & foundation:** Next.js + Tailwind + Drizzle + Neon connection;
   schema + migrations; passcode auth + middleware; PWA shell (manifest + Apple
   meta + safe-area layout).
2. **`/themes` static gallery:** build all 10 mockups → **user picks one.**
3. **Core app in chosen theme:** dashboard (month switcher + overview + category
   cards), Add Expense sheet, category detail + history, manage categories.
4. **Polish & deploy:** validation/edge cases, tests, deploy to Vercel, verify
   iOS home-screen install.

---

## 12. Open Questions / Future
- Per-month budget overrides (budgets that change month to month).
- Unused-budget carry-over.
- Charts (pie/bar) beyond the simple progress-bar overview.
- Export (CSV) / backup.
- Optional offline support via service worker.
