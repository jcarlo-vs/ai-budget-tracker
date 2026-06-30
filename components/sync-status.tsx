"use client";

import { useState, useEffect } from "react";
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from "@/lib/sync/client";
import { lockApp } from "@/lib/local/lock";

/**
 * Tiny status pill: Offline / Syncing… / Synced ✓
 * Subscribes to the module-level sync-status in lib/sync/client.ts and
 * listens for navigator.online/offline events. Purely additive — reads no
 * server state, writes nothing.
 */
export function SyncStatusChip() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Hydrate from live state (can't read navigator in SSR)
    setOnline(navigator.onLine);
    setStatus(getSyncStatus());

    const unsub = subscribeSyncStatus(setStatus);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!online) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{
          background: "rgba(255, 69, 58, 0.12)",
          border: "0.5px solid rgba(255, 69, 58, 0.30)",
          color: "var(--danger)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" aria-hidden />
        Offline
      </span>
    );
  }

  if (status === "unauthed") {
    return (
      <button
        type="button"
        onClick={() => void lockApp()}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition active:scale-95"
        style={{
          background: "rgba(255, 159, 10, 0.14)",
          border: "0.5px solid rgba(255, 159, 10, 0.34)",
          color: "#ff9f0a",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#ff9f0a" }} aria-hidden />
        Sign in to sync
      </button>
    );
  }

  if (status === "syncing") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{
          background: "rgba(10, 132, 255, 0.12)",
          border: "0.5px solid rgba(10, 132, 255, 0.30)",
          color: "var(--accent)",
        }}
      >
        <span className="glow-pulse h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
        Syncing…
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: "rgba(48, 209, 88, 0.10)",
        border: "0.5px solid rgba(48, 209, 88, 0.28)",
        color: "var(--accent-2)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" aria-hidden />
      Synced ✓
    </span>
  );
}
