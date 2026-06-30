"use client";

import { useEffect } from "react";
import { bootstrapIfEmpty } from "@/lib/local/bootstrap";
import { syncNow, requestSync } from "@/lib/sync/client";
import { LOCAL_MUTATION_EVENT } from "@/lib/local/touch";

// Drives background sync: once on mount (after bootstrapping an empty store),
// debounced after each local mutation, and whenever connectivity returns. Never
// blocks rendering — failures are swallowed and retried on the next trigger.
export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await bootstrapIfEmpty();
      if (!cancelled) await syncNow();
    })();

    const onMutation = () => requestSync();
    const onOnline = () => void syncNow();
    window.addEventListener(LOCAL_MUTATION_EVENT, onMutation);
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener(LOCAL_MUTATION_EVENT, onMutation);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return <>{children}</>;
}
