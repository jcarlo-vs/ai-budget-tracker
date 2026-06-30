"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession, sessionCookieOptions } from "@/lib/auth";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { createHash, timingSafeEqual } from "node:crypto";

// Constant-time compare: hashing first guarantees equal-length buffers
// (timingSafeEqual throws on length mismatch) and avoids leaking length.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Validates the passcode and sets the session cookie used by /api/sync. Returns a
// result (no redirect) so the client lock screen can store the offline unlock hash
// and reveal the app in place — navigation/gating is now client-side via LockGate.
export async function loginAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const passcode = String(form.get("passcode") ?? "");
  const expected = process.env.APP_PASSCODE;
  if (!expected || !safeEqual(passcode, expected)) return fail("Incorrect passcode");
  const token = await signSession(process.env.AUTH_SECRET!);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return ok();
}

// Clears the server session. The client also re-locks via lockApp().
export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
