import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession, sessionCookieOptions, verifySession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { applyChanges, fetchChangedSince } from "@/lib/server/sync";
import { syncBodySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token, process.env.AUTH_SECRET!))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = syncBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Push errors must never block the pull: a single bad/duplicate row is already
  // skipped per-row inside applyChanges, but guard the whole push as well so the
  // device always still receives its updates.
  try {
    await applyChanges(db, parsed.data.changes);
  } catch {
    // ignore — fall through to the pull
  }
  const rows = await fetchChangedSince(db, parsed.data.since);

  // Sliding session: re-issue the cookie on every authenticated sync so a device
  // that keeps syncing within the 30-day window never lets its session expire.
  const res = NextResponse.json({ rows, now: new Date().toISOString() });
  res.cookies.set(SESSION_COOKIE, await signSession(process.env.AUTH_SECRET!), sessionCookieOptions());
  return res;
}
