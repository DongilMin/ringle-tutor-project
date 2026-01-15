import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipCard } from "../../components/MembershipCard";

describe("MembershipCard", () => {
  it("renders active status with remaining days", () => {
    render(<MembershipCard status="active" remainingDays={15} />);

    expect(screen.getByText("Membership Status")).toBeInTheDocument();
    expect(screen.getByText("Active - 15 days left")).toBeInTheDocument();
  });

  it("renders expired status", () => {
    render(<MembershipCard status="expired" />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("renders no membership status with purchase button", () => {
    render(<MembershipCard status="none" />);

    expect(screen.getByText("No Membership")).toBeInTheDocument();
    expect(screen.getByText("Purchase Membership")).toBeInTheDocument();
  });
});
