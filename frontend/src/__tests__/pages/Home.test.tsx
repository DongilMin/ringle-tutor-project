import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../../pages/Home";

describe("Home Page", () => {
  it("renders welcome message", () => {
    render(<Home />);

    expect(screen.getByText("Welcome to AI English Tutor!")).toBeInTheDocument();
  });

  it("renders membership card", () => {
    render(<Home />);

    expect(screen.getByText("Membership Status")).toBeInTheDocument();
  });
});
