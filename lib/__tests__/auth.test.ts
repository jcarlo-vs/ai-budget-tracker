import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/auth";

const secret = "test-secret-at-least-32-characters-long!!";

describe("session", () => {
  it("verifies a token it signed", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token, secret)).toBe(true);
  });
  it("rejects undefined", async () => {
    expect(await verifySession(undefined, secret)).toBe(false);
  });
  it("rejects tampered token", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token + "x", secret)).toBe(false);
  });
  it("rejects wrong secret", async () => {
    const token = await signSession(secret);
    expect(await verifySession(token, "another-secret-at-least-32-characters!!")).toBe(false);
  });
});
