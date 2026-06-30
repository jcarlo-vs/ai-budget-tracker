import { describe, it, expect } from "vitest";
import { mergeRow } from "@/lib/sync/merge";
const base = { id: "a", updatedAt: "2026-06-01T00:00:00.000Z", deletedAt: null as string | null };

describe("mergeRow (last-write-wins)", () => {
  it("inserts when nothing exists", () => {
    expect(mergeRow(undefined, base)).toEqual(base);
  });
  it("incoming newer wins", () => {
    const inc = { ...base, updatedAt: "2026-06-02T00:00:00.000Z" };
    expect(mergeRow(base, inc)).toEqual(inc);
  });
  it("incoming older is ignored", () => {
    const inc = { ...base, updatedAt: "2026-05-01T00:00:00.000Z" };
    expect(mergeRow(base, inc)).toEqual(base);
  });
  it("tombstone (newer) wins", () => {
    const inc = { ...base, updatedAt: "2026-06-03T00:00:00.000Z", deletedAt: "2026-06-03T00:00:00.000Z" };
    expect(mergeRow(base, inc)).toEqual(inc);
  });
});
