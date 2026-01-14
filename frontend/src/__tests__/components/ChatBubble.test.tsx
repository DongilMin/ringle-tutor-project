import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatBubble } from "../../components/ChatBubble";

describe("ChatBubble", () => {
  const mockTimestamp = new Date("2026-01-15T10:30:00");

  it("renders user message with correct styling", () => {
    render(
      <ChatBubble text="Hello from user" sender="user" timestamp={mockTimestamp} />
    );

    expect(screen.getByText("Hello from user")).toBeInTheDocument();
  });

  it("renders AI message with correct styling", () => {
    render(
      <ChatBubble text="Hello from AI" sender="ai" timestamp={mockTimestamp} />
    );

    expect(screen.getByText("Hello from AI")).toBeInTheDocument();
  });

  it("displays timestamp", () => {
    render(
      <ChatBubble text="Test message" sender="user" timestamp={mockTimestamp} />
    );

    // Check that time is displayed (format depends on locale)
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });
});
