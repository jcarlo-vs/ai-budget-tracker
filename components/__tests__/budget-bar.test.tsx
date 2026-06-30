// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetBar } from "@/components/budget-bar";

describe("BudgetBar", () => {
  it("shows spent and budget formatted", () => {
    render(<BudgetBar spent={20000} budget={500000} />);
    expect(screen.getByText(/₱200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/₱5,000\.00/)).toBeInTheDocument();
  });
  it("flags over budget", () => {
    render(<BudgetBar spent={600000} budget={500000} />);
    expect(screen.getByTestId("budget-bar")).toHaveAttribute("data-over", "true");
  });
});
