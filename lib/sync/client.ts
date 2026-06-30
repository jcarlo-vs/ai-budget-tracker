import { toast } from "sonner";
import { localDb, getMeta, setMeta } from "@/lib/local/db";
import { mergeRow } from "@/lib/sync/merge";
import type { SyncChanges, SyncRequestBody, SyncResponse } from "@/lib/sync/types";

// Two independent cursors on two clocks (never mix them):
//  - lastPushedAt: CLIENT clock. The high-water-mark for local edits already pushed;
//    collectChanges filters local rows by `updatedAt > lastPushedAt`.
//  - lastPulledAt: SERVER clock (the `now` the server returns); the `since` we send so
//    the server returns rows it stamped after our last pull.
const LAST_PUSHED_KEY = "lastPushedAt";
const LAST_PULLED_KEY = "lastPulledAt";
export const EPOCH = "1970-01-01T00:00:00.000Z";

const TABLES = ["categories", "transactions", "expenseItems", "monthlyBudgets"] as const;
type TableKey = (typeof TABLES)[number];

// Local rows whose updatedAt is strictly newer than the client push cursor.
export async function collectChanges(since: string): Promise<SyncChanges> {
  const out: SyncChanges = { categories: [], transactions: [], expenseItems: [], monthlyBudgets: [] };
  for (const key of TABLES) {
    const rows = await localDb[key].toArray();
    out[key] = rows.filter((r) => r.updatedAt > since) as never;
  }
  return out;
}

// Merge pulled rows into Dexie with the same last-write-wins rule the server uses.
async function mergeChanges(rows: SyncChanges): Promise<void> {
  for (const key of TABLES) {
    const table = localDb[key];
    for (const row of rows[key]) {
      const existing = await table.get(row.id);
      const winner = mergeRow(existing as never, row as never);
      if (winner === row) await table.put(row as never);
    }
  }
}

// ─── Sync-status observability (for <SyncStatusChip>) ──────────────────────
export type SyncStatus = "idle" | "syncing" | "unauthed";
let _syncStatus: SyncStatus = "idle";
const _statusListeners = new Set<(s: SyncStatus) => void>();

/** Returns the current sync status (safe to call on server — returns "idle"). */
export function getSyncStatus(): SyncStatus { return _syncStatus; }

/** Subscribe to sync-status changes. Returns an unsubscribe function. */
export function subscribeSyncStatus(cb: (s: SyncStatus) => void): () => void {
  _statusListeners.add(cb);
  return () => { _statusListeners.delete(cb); };
}

function _notifyStatus(s: SyncStatus): void {
  _syncStatus = s;
  _statusListeners.forEach((fn) => fn(s));
}
// ────────────────────────────────────────────────────────────────────────────

let syncing = false;
let authToastShown = false;

export async function syncNow(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (syncing) return;
  syncing = true;
  _notifyStatus("syncing");
  let endStatus: SyncStatus = "idle";
  try {
    // Capture the push cursor's next value on the CLIENT clock BEFORE collecting, so any
    // edit made during the round-trip stays > lastPushedAt and is pushed next time.
    const startedAt = new Date().toISOString();
    const lastPushedAt = (await getMeta(LAST_PUSHED_KEY)) ?? EPOCH;
    const lastPulledAt = (await getMeta(LAST_PULLED_KEY)) ?? EPOCH;
    const body: SyncRequestBody = { since: lastPulledAt, changes: await collectChanges(lastPushedAt) };
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      // Session expired/missing (e.g. iOS PWA's separate cookie jar). The app is
      // local-first and fully usable without the server — do NOT lock it (that yanks
      // the user out mid-action). Surface a quiet "sign in to sync" state instead,
      // with a one-time toast; the user re-auths from the sync chip to resume.
      endStatus = "unauthed";
      if (!authToastShown) {
        authToastShown = true;
        toast.error("Couldn't sync — tap the sync chip in Manage to sign in.");
      }
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as SyncResponse;
    await mergeChanges(data.rows);
    await setMeta(LAST_PULLED_KEY, data.now); // server clock
    await setMeta(LAST_PUSHED_KEY, startedAt); // client clock
    authToastShown = false; // synced fine — allow the toast again if it later fails
  } catch {
    // Offline / network — swallow; the next trigger retries.
  } finally {
    syncing = false;
    _notifyStatus(endStatus);
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Debounced sync used after local mutations so a burst of edits triggers one call.
export function requestSync(delay = 1500): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, delay);
}
