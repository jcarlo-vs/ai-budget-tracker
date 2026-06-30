import { describe, it, expect } from "vitest";
import { categorySchema, expenseSchema } from "@/lib/schemas";

describe("categorySchema", () => {
  it("accepts valid input", () => {
    const r = categorySchema.safeParse({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000 });
    expect(r.success).toBe(true);
  });
  it("rejects empty name", () => {
    expect(categorySchema.safeParse({ name: "", emoji: "🍜", color: "#10b981", monthlyBudget: 0 }).success).toBe(false);
  });
  it("rejects negative budget", () => {
    expect(categorySchema.safeParse({ name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: -1 }).success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("accepts valid input", () => {
    const r = expenseSchema.safeParse({ categoryId: 1, amount: 12500, description: "Lunch", occurredOn: "2026-06-30" });
    expect(r.success).toBe(true);
  });
  it("rejects zero amount", () => {
    expect(expenseSchema.safeParse({ categoryId: 1, amount: 0, description: "", occurredOn: "2026-06-30" }).success).toBe(false);
  });
  it("rejects bad date", () => {
    expect(expenseSchema.safeParse({ categoryId: 1, amount: 100, description: "", occurredOn: "30-06-2026" }).success).toBe(false);
  });
});
