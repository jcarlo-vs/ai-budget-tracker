import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "bt_session";

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(secret: string): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(secret));
    return payload.ok === true;
  } catch {
    return false;
  }
}
