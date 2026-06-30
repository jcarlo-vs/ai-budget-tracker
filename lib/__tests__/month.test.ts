import { describe, it, expect } from "vitest";
import { getYearMonth, monthRange, shiftMonth, formatMonthLabel, parseYearMonth, monthKey } from "@/lib/month";

describe("getYearMonth", () => {
  it("extracts 1-based month", () => {
    expect(getYearMonth(new Date("2026-06-30T12:00:00Z"))).toEqual({ year: 2026, month: 6 });
  });
});

describe("monthRange", () => {
  it("returns half-open range", () => {
    expect(monthRange({ year: 2026, month: 6 })).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });
  it("wraps year at december", () => {
    expect(monthRange({ year: 2026, month: 12 })).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("shiftMonth", () => {
  it("goes back across year", () => expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 }));
  it("goes forward across year", () => expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 }));
});

describe("formatMonthLabel", () => {
  it("formats label", () => expect(formatMonthLabel({ year: 2026, month: 6 })).toBe("June 2026"));
});

describe("parseYearMonth", () => {
  const fb = { year: 2026, month: 6 };
  it("uses valid params", () => expect(parseYearMonth("2025", "3", fb)).toEqual({ year: 2025, month: 3 }));
  it("falls back when params are missing", () => expect(parseYearMonth(undefined, undefined, fb)).toEqual(fb));
  it("falls back on non-numeric input", () => expect(parseYearMonth("abc", "xyz", fb)).toEqual(fb));
  it("falls back on out-of-range month", () => expect(parseYearMonth("2025", "13", fb)).toEqual({ year: 2025, month: 6 }));
  it("falls back on zero month", () => expect(parseYearMonth("2025", "0", fb)).toEqual({ year: 2025, month: 6 }));
  it("falls back on fractional values", () => expect(parseYearMonth("2025.5", "3", fb)).toEqual({ year: 2026, month: 3 }));
});

describe("monthKey", () => {
  it("zero-pads the month", () => expect(monthKey({ year: 2026, month: 6 })).toBe("2026-06"));
  it("handles december", () => expect(monthKey({ year: 2026, month: 12 })).toBe("2026-12"));
});
