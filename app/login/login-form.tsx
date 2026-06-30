"use client";

import { useState } from "react";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";
import { storeUnlock, verifyOffline } from "@/lib/local/lock";

// The unlock form, used both on the (legacy) /login route and inside <LockGate>.
// Online it validates against the server (setting the sync session cookie) and
// stores the offline unlock hash; offline it verifies against that stored hash.
// A successful unlock dispatches the app-unlock event (via storeUnlock), which
// LockGate listens for to reveal the app in place.
export function LoginForm() {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const passcode = String(form.get("passcode") ?? "");
    if (!passcode) return;
    setPending(true);
    try {
      const online = typeof navigator === "undefined" || navigator.onLine !== false;
      if (online) {
        try {
          const res = await loginAction({ ok: true }, form);
          if (res.ok) {
            await storeUnlock(passcode);
            return;
          }
          toast.error(res.error);
          return;
        } catch {
          // Network failure while nominally "online" — fall back to offline verify.
        }
      }
      if (await verifyOffline(passcode)) {
        await storeUnlock(passcode);
        return;
      }
      toast.error("Incorrect passcode");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <input
        name="passcode"
        type="password"
        inputMode="numeric"
        autoFocus
        placeholder="Passcode"
        className="field display w-full px-4 py-3.5 text-center text-lg tracking-[0.3em]"
      />
      <button type="submit" disabled={pending} className="btn-accent w-full px-4 py-3.5">
        {pending ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}
