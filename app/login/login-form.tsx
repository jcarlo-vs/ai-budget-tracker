"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/action-result";

const initial: ActionResult = { ok: true };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="w-full space-y-4">
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
