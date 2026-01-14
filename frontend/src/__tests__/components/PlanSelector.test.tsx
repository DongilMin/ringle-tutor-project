import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanSelector } from "../../components/PlanSelector";

describe("PlanSelector", () => {
  it("renders all plans", () => {
    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    expect(screen.getByText("Select a Membership Plan")).toBeInTheDocument();
    expect(screen.getByText("Basic Plan")).toBeInTheDocument();
    expect(screen.getByText("Premium Plan")).toBeInTheDocument();
  });

  it("calls onSelectPlan when basic plan is selected", () => {
    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    fireEvent.click(screen.getByText("Select Basic Plan"));

    expect(mockOnSelectPlan).toHaveBeenCalledWith("basic");
  });

  it("calls onSelectPlan when premium plan is selected", () => {
    const mockOnSelectPlan = vi.fn();
    render(<PlanSelector onSelectPlan={mockOnSelectPlan} />);

    fireEvent.click(screen.getByText("Select Premium Plan"));

    expect(mockOnSelectPlan).toHaveBeenCalledWith("premium");
  });
});
