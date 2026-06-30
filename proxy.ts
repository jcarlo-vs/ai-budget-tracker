import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Auth is now enforced client-side by <LockGate> (the app must open offline, so
// the middleware can't gate page routes anymore). The only thing the server still
// guards is the sync API, which mutates Neon and must require a valid session.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/sync")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const ok = await verifySession(token, process.env.AUTH_SECRET!);
    if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
