// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryCard } from "@/components/category-card";

const category = { id: 1, name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 500000, sortOrder: 0, archived: false, createdAt: new Date() };

describe("CategoryCard", () => {
  it("renders name, emoji, spent and links to detail", () => {
    render(<CategoryCard category={category as any} spent={20000} />);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("🍜")).toBeInTheDocument();
    expect(screen.getByText(/₱200\.00/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/category/1");
  });
});
