import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Conversation from "../../pages/Conversation";

describe("Conversation Page", () => {
  it("renders conversation title", () => {
    render(<Conversation />);

    expect(screen.getByText("AI English Tutor")).toBeInTheDocument();
  });

  it("renders initial AI greeting message", () => {
    render(<Conversation />);

    expect(
      screen.getByText(/Hello! I'm your AI English tutor/)
    ).toBeInTheDocument();
  });

  it("renders start recording button initially", () => {
    render(<Conversation />);

    expect(screen.getByText("Start Recording")).toBeInTheDocument();
  });

  it("shows stop recording button when recording starts", () => {
    render(<Conversation />);

    fireEvent.click(screen.getByText("Start Recording"));

    expect(screen.getByText("Stop Recording")).toBeInTheDocument();
  });

  it("adds user message when recording stops", () => {
    render(<Conversation />);

    fireEvent.click(screen.getByText("Start Recording"));
    fireEvent.click(screen.getByText("Stop Recording"));

    expect(
      screen.getByText("This is a sample user message from recording.")
    ).toBeInTheDocument();
  });
});
