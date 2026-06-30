import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/action-result";

describe("action-result", () => {
  it("builds ok", () => expect(ok()).toEqual({ ok: true }));
  it("builds fail", () => expect(fail("nope")).toEqual({ ok: false, error: "nope" }));
});
