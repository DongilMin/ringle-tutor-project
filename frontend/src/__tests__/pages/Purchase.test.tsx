import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Purchase from "../../pages/Purchase";

describe("Purchase Page", () => {
  it("renders purchase title", () => {
    render(<Purchase />);

    expect(screen.getByText("Purchase Membership")).toBeInTheDocument();
  });

  it("renders plan selector", () => {
    render(<Purchase />);

    expect(screen.getByText("Select a Membership Plan")).toBeInTheDocument();
    expect(screen.getByText("Basic Plan")).toBeInTheDocument();
    expect(screen.getByText("Premium Plan")).toBeInTheDocument();
  });
});
