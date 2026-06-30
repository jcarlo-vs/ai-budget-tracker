"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/app/login/login-form";
import { SyncProvider } from "@/components/sync-provider";
import { isUnlocked, APP_LOCK_EVENT, APP_UNLOCK_EVENT } from "@/lib/local/lock";

// Client-side gate that replaces the old middleware auth. While locked it shows
// the passcode screen; once unlocked it renders the app wrapped in <SyncProvider>.
// Reacts to app-lock / app-unlock events so login and logout flip it in place.
export function LockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void isUnlocked().then((v) => {
      if (active) setUnlocked(v);
    });
    const onUnlock = () => setUnlocked(true);
    const onLock = () => setUnlocked(false);
    window.addEventListener(APP_UNLOCK_EVENT, onUnlock);
    window.addEventListener(APP_LOCK_EVENT, onLock);
    return () => {
      active = false;
      window.removeEventListener(APP_UNLOCK_EVENT, onUnlock);
      window.removeEventListener(APP_LOCK_EVENT, onLock);
    };
  }, []);

  // First paint before the async check resolves: render nothing to avoid a flash
  // of either screen (and to keep SSR/CSR markup identical).
  if (unlocked === null) return null;

  if (!unlocked) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
        <div className="reveal text-center">
          <div
            className="mx-auto grid h-20 w-20 place-items-center rounded-3xl text-5xl ring-1 ring-inset ring-[var(--border)] shadow-[0_0_40px_-10px_var(--accent-glow)]"
            style={{ background: "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 70%)" }}
          >
            💸
          </div>
          <h1 className="display mt-5 text-2xl font-bold tracking-tight">Budget Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your passcode</p>
        </div>
        <div className="reveal w-full max-w-xs" style={{ animationDelay: "80ms" }}>
          <LoginForm />
        </div>
      </main>
    );
  }

  return <SyncProvider>{children}</SyncProvider>;
}
