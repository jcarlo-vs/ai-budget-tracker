import { getMeta, setMeta } from "@/lib/local/db";

const HASH_KEY = "unlockHash";
const UNLOCKED_KEY = "unlocked";

export const APP_UNLOCK_EVENT = "app-unlock";
export const APP_LOCK_EVENT = "app-lock";

function dispatch(name: string): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(name));
  }
}

export async function hashPasscode(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Store the SHA-256 of the passcode + the unlocked flag. Called on a successful
// online login (real validation) and on a successful offline verify.
export async function storeUnlock(passcode: string): Promise<void> {
  await setMeta(HASH_KEY, await hashPasscode(passcode));
  await setMeta(UNLOCKED_KEY, "1");
  dispatch(APP_UNLOCK_EVENT);
}

export async function isUnlocked(): Promise<boolean> {
  return (await getMeta(UNLOCKED_KEY)) === "1";
}

export async function hasStoredPasscode(): Promise<boolean> {
  return Boolean(await getMeta(HASH_KEY));
}

// Offline check: compare the entered passcode against the stored hash.
export async function verifyOffline(passcode: string): Promise<boolean> {
  const stored = await getMeta(HASH_KEY);
  if (!stored) return false;
  return (await hashPasscode(passcode)) === stored;
}

export async function lockApp(): Promise<void> {
  await setMeta(UNLOCKED_KEY, "0");
  dispatch(APP_LOCK_EVENT);
}
