import { localDb } from "@/lib/local/db";
import { syncNow } from "@/lib/sync/client";

// First run after the update: if the local store is empty and we're online, pull
// the full dataset (since = epoch) so the app has data to run from offline.
export async function bootstrapIfEmpty(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const count = await localDb.categories.count();
  if (count === 0) await syncNow();
}
