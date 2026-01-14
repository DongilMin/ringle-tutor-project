import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";

class MockMediaRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = "inactive";
  constructor(public stream: MediaStream) {}
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; if (this.onstop) this.onstop(); }
  pause() { this.state = "paused"; }
  resume() { this.state = "recording"; }
}

describe("useAudioRecorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("initializes with idle state", () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.state).toBe("idle");
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.duration).toBe(0);
  });

  it("starts recording when startRecording is called", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      writable: true,
    });

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => { await result.current.startRecording(); });
    expect(result.current.state).toBe("recording");
  });

  it("sets error when getUserMedia fails", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")) },
      writable: true,
    });

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => { await result.current.startRecording(); });
    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBe("Permission denied");
  });

  it("resets recording state", () => {
    const { result } = renderHook(() => useAudioRecorder());
    act(() => { result.current.resetRecording(); });
    expect(result.current.state).toBe("idle");
    expect(result.current.audioBlob).toBeNull();
  });
});
