"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { createHash, timingSafeEqual } from "node:crypto";

// Constant-time compare: hashing first guarantees equal-length buffers
// (timingSafeEqual throws on length mismatch) and avoids leaking length.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function loginAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const passcode = String(form.get("passcode") ?? "");
  const expected = process.env.APP_PASSCODE;
  if (!expected || !safeEqual(passcode, expected)) return fail("Incorrect passcode");
  const token = await signSession(process.env.AUTH_SECRET!);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
  return ok();
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
