import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Waveform } from "../../components/Waveform";

class MockAudioContext {
  createAnalyser() {
    return { fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData: vi.fn() };
  }
  createMediaStreamSource() { return { connect: vi.fn() }; }
  close() { return Promise.resolve(); }
}

describe("Waveform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  });

  it("renders canvas element", () => {
    render(<Waveform mediaStream={null} isRecording={false} />);
    expect(screen.getByTestId("waveform-canvas")).toBeInTheDocument();
  });

  it("renders with custom dimensions", () => {
    render(<Waveform mediaStream={null} isRecording={false} width={400} height={150} />);
    const canvas = screen.getByTestId("waveform-canvas");
    expect(canvas).toHaveAttribute("width", "400");
    expect(canvas).toHaveAttribute("height", "150");
  });

  it("renders with default dimensions", () => {
    render(<Waveform mediaStream={null} isRecording={false} />);
    const canvas = screen.getByTestId("waveform-canvas");
    expect(canvas).toHaveAttribute("width", "300");
    expect(canvas).toHaveAttribute("height", "100");
  });

  it("applies border styling", () => {
    render(<Waveform mediaStream={null} isRecording={false} color="#ff0000" />);
    const canvas = screen.getByTestId("waveform-canvas");
    expect(canvas).toHaveAttribute("style");
    expect(canvas.style.borderRadius).toBe("8px");
  });
});
