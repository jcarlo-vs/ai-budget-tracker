# Offline Mode — Design (offline-first + last-write-wins sync)

**Date:** 2026-06-30
**Builds on:** the existing budget tracker (Next.js 16 App Router, Drizzle, Neon, Apple
Liquid Glass dark theme; features: passcode auth, categories + per-category budgets, monthly
overall budgets, expenses with payment methods + line items, savings, Mark Paid, browse-by-month).

## Goal & success criteria

Turn the app into an **offline-first PWA** for two users (the owner + spouse, one shared
household budget):

- ✅ Opens and is **fully usable with no internet** — view dashboard/savings/categories, add/
  edit/delete expenses (incl. itemized), set/clear budgets, manage categories, Mark Paid.
- ✅ Data lives **on the device** (IndexedDB) and is the source of truth for the UI.
- ✅ When online, it **syncs both ways** with the cloud (Neon) so both phones converge and
  the cloud is a backup. Conflicts resolved **last-write-wins** (rare for two users).
- ✅ Installable to the iOS home screen and works after force-quit / airplane mode.

## Approach: local-first, last-write-wins

The device's IndexedDB is the single source of truth the UI reads/writes (instant, offline).
A background sync reconciles it with Neon: push local changes, pull remote changes, newest
`updatedAt` wins. A small custom sync (Dexie + one API route) — **not** a managed sync
service (PowerSync/ElectricSQL) which is overkill/costly for a 2-user app.

```
┌─────────── iPhone (PWA) ───────────┐        ┌──────── Server ────────┐
│  UI (client components)            │        │  /api/sync route        │
│     ↕ read/write (instant)         │  HTTPS │   (auth: passcode       │
│  IndexedDB (Dexie) = source of     │ ◀────▶ │    session cookie)      │
│  truth: categories, transactions,  │  push/ │     ↕                   │
│  expense_items, monthly_budgets    │  pull  │  Neon Postgres (backup, │
│  + sync meta (lastSyncAt)          │  (LWW) │   bridge between phones) │
│  Service worker caches the shell   │        └─────────────────────────┘
└────────────────────────────────────┘
```

## Data model changes (server + local mirror)

Every table changes so rows can be created offline and merged:

1. **Primary keys → UUID text** (`crypto.randomUUID()`), generated on the device. Removes the
   need for a server round-trip to create a record and avoids id collisions across phones.
   *(This changes id types from `number` → `string` throughout the app — see "Ripple".)*
2. **Add `updatedAt` (timestamptz)** to every table — bumped on every write; drives LWW.
3. **Add `deletedAt` (timestamptz, nullable)** — soft-delete **tombstone** so deletions sync
   (a hard delete can't propagate). The UI filters out `deletedAt != null`.

Per table (Neon + Dexie mirror):
- `categories`: id(uuid), name, emoji, color, monthlyBudget, sortOrder, archived, createdAt, **updatedAt, deletedAt**
- `transactions`: id(uuid), categoryId(uuid), amount, description, occurredOn, paymentMethod, createdAt, **updatedAt, deletedAt**
- `expense_items`: id(uuid), transactionId(uuid), name, amount, createdAt, **updatedAt, deletedAt**
- `monthly_budgets`: id(uuid), year, month, amount, **updatedAt, deletedAt**; replace the
  `unique(year,month)` with a **partial unique index on (year,month) where deleted_at is null**
  (so a tombstoned month + a live one can coexist). Sync matches budgets by their uuid id; the
  app upserts by (year,month) locally.

FKs (`transactions.categoryId`, `expense_items.transactionId`) become uuid references.

### Ripple (acknowledged, part of the work)
Changing ids `number → string` touches: `lib/db/schema.ts` types, all `lib/data/*` and the
client data layer, Zod id schemas (`z.coerce.number().int()` → `z.string().uuid()`),
`app/category/[id]` param handling, every component prop typed `categoryId: number`, and the
tests. This is expected; the plan sequences it.

## Local store — Dexie (`lib/local/db.ts`)
A Dexie database mirroring the 4 tables + a `meta` table holding `lastSyncAt` and the unlock
state. Indexes: categories by sortOrder; transactions by categoryId + occurredOn; items by
transactionId; budgets by `[year+month]`. All stores keyed by uuid `id`. Reads filter
`deletedAt == null`.

## Client data-access layer (`lib/local/data/*`)
Mirror the existing `lib/data/*` API (categories, transactions, overview, savings, budgets,
items) **against Dexie** instead of Drizzle/Neon, returning the same shapes the components
already use. Every mutation sets `updatedAt = now` (and `deletedAt` for deletes) and triggers a
debounced sync. This keeps component code largely the same — only the data source changes.

## Pages → client-rendered
Convert the data-driven pages from server components (reading Neon) to **client components
reading Dexie**: dashboard (`app/page.tsx`), `app/category/[id]`, `app/savings`,
`app/categories`. The server actions (`app/actions/*`) are replaced by direct local
mutations (Dexie) for these flows; server mutation actions remain only behind `/api/sync`.
Presentational components (gauge, cards, sheets, nav) are reused unchanged.

## Sync protocol (`/api/sync` + `lib/sync/*`)
- **Client** keeps `meta.lastSyncAt` (ISO string, default epoch 0).
- **Push+pull in one call:** `POST /api/sync` with `{ since: lastSyncAt, changes: { categories, transactions, items, budgets } }` where each array = local rows with `updatedAt > lastSyncAt` (tombstones included).
- **Server** (authenticated by the passcode session cookie, like the proxy):
  1. For each incoming row, **upsert by id with LWW** — write only if it doesn't exist or
     `incoming.updatedAt >= existing.updatedAt`.
  2. Select all rows with `updatedAt > since` across the 4 tables → the pull payload.
  3. Return `{ rows: {…}, now: <server timestamp> }`.
- **Client** merges pulled rows into Dexie with the same LWW rule, then sets
  `lastSyncAt = now`.
- **Triggers:** on app launch (if online), after each local mutation (debounced ~1.5s), and on
  the `online` event / regaining connectivity. Non-blocking; failures retry on next trigger.
- **LWW merge** is a pure function (`lib/sync/merge.ts`) → easy to unit test.

## Offline auth / lock
The middleware (`proxy.ts`) can't gate routes offline (no server). Move the gate **client-side**:
- A `LockGate` client component wraps the app; if not unlocked, it shows the passcode screen.
- On first **online** unlock, the server validates the passcode (existing action) and the
  client stores a **SHA-256 hash of the passcode** + an "unlocked" flag in Dexie/localStorage.
- Offline, the lock screen checks the entered passcode against the stored hash.
- `/api/sync` (and any remaining server route) stays protected by the existing session cookie
  online. The home-screen app shell is served by the service worker so it loads while "logged
  out" at the edge, and the client lock takes over.

## Service worker (`@serwist/next`)
Add Serwist (the maintained PWA toolkit for Next App Router): precache the build assets +
app shell, runtime-cache navigation requests, offline fallback. Registers on load. Result:
the app opens with no network.

## Migration of existing data (one-time, careful)
A Drizzle migration converts the live Neon data to the new schema:
1. Add `id_uuid` (default `gen_random_uuid()`), `updated_at` (default now), `deleted_at` to
   each table; backfill `id_uuid` for existing rows.
2. Add uuid FK columns, backfill by joining on the old int ids.
3. Drop old int FKs/PKs, rename uuid columns to `id`/`category_id`/`transaction_id`, set PKs +
   FKs + the partial unique index on budgets.
The PGlite test DB applies the same migration. **Back up Neon first** (Neon point-in-time
restore / branch, or export) before running it.

## Bootstrap / first run
On first load after the update (online): if Dexie is empty, call `/api/sync` with `since=0` to
pull the full dataset into Dexie, then run from Dexie. Subsequent loads are offline-capable.

## Error handling
- Sync failures (offline / network / 401) are swallowed and retried on the next trigger; the UI
  never blocks on sync.
- A small **sync-status indicator** (synced / syncing / offline) so the user knows state.
- Malformed/duplicate rows are ignored defensively in the merge.

## Testing
- `lib/sync/merge.ts` — pure LWW merge: newer wins, tombstone wins, missing row inserted,
  older incoming ignored. (Vitest, pure.)
- `lib/local/data/*` — Dexie data access via `fake-indexeddb` (savings/overview math, CRUD,
  soft-delete filtering, budget upsert by (year,month)).
- `/api/sync` route — push applies LWW; pull returns rows since `since`; auth required.
- Keep existing pure-logic tests (money, month) green; data-layer tests move to the new layer.

## Staged delivery
- **Stage 1 — offline foundation (the bulk):** UUID/updatedAt/deletedAt migration; Dexie store
  + client data layer; convert the 4 pages to client-rendered; client mutations; offline
  `LockGate`; `@serwist/next` service worker; bootstrap pull; `/api/sync` + push/pull LWW sync
  on launch / after-edit / reconnect. **Delivers: works offline + two-way sync.**
- **Stage 2 — polish & hardening:** sync-status indicator, tombstone purge, retry/backoff,
  conflict-edge tests, perf, and a manual "Sync now" + "Export backup (JSON)" affordance.

## Out of scope (YAGNI)
- Real-time/CRDT conflict resolution (LWW suffices for two users).
- Multi-tenant accounts / per-user data separation (one shared household budget).
- Background push notifications.

## Risks & mitigations
- **Breaking deploy:** the schema migration + the new (uuid-aware) code must ship together; the
  old deployed code won't work against the migrated schema. Plan a single coordinated
  deploy + migration window. **Back up Neon first.**
- **iOS storage eviction:** mitigated by the cloud sync (Neon = backup) + `navigator.storage.persist()`.
- **Clock skew:** LWW uses client-set `updatedAt`, so two phones with badly wrong clocks could
  resolve a tie oddly. Acceptable for two cooperating users; the server could stamp/validate
  `updatedAt` on push as a future hardening if needed.
- **Scope:** large rebuild touching every screen — sequenced in stages; each stage ends green
  (tsc + tests) before the next.
