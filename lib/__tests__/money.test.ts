import { describe, it, expect } from "vitest";
import { parseAmountToCentavos, formatCentavos } from "@/lib/money";

describe("parseAmountToCentavos", () => {
  it("parses whole pesos", () => expect(parseAmountToCentavos("1250")).toBe(125000));
  it("parses decimals", () => expect(parseAmountToCentavos("1250.5")).toBe(125050));
  it("strips thousands commas", () => expect(parseAmountToCentavos("1,250.50")).toBe(125050));
  it("rounds to 2 decimals", () => expect(parseAmountToCentavos("0.005")).toBe(1));
  it("rejects empty", () => expect(parseAmountToCentavos("")).toBeNull());
  it("rejects non-numeric", () => expect(parseAmountToCentavos("abc")).toBeNull());
  it("rejects negative", () => expect(parseAmountToCentavos("-5")).toBeNull());
});

describe("formatCentavos", () => {
  it("formats with symbol and grouping", () => expect(formatCentavos(125050)).toBe("₱1,250.50"));
  it("formats zero", () => expect(formatCentavos(0)).toBe("₱0.00"));
  it("omits symbol when asked", () => expect(formatCentavos(125050, { symbol: false })).toBe("1,250.50"));
});
