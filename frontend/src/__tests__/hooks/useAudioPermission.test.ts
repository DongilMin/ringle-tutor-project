import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioPermission } from "../../hooks/useAudioPermission";

describe("useAudioPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with unknown permission state", () => {
    const { result } = renderHook(() => useAudioPermission());
    expect(result.current.permissionState).toBe("unknown");
    expect(result.current.error).toBeNull();
  });

  it("sets permission to granted when getUserMedia succeeds", async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      writable: true,
    });

    const { result } = renderHook(() => useAudioPermission());
    await act(async () => {
      const success = await result.current.requestPermission();
      expect(success).toBe(true);
    });
    expect(result.current.permissionState).toBe("granted");
  });

  it("sets permission to denied on NotAllowedError", async () => {
    const error = new Error("Permission denied");
    error.name = "NotAllowedError";
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue(error) },
      writable: true,
    });

    const { result } = renderHook(() => useAudioPermission());
    await act(async () => {
      await result.current.requestPermission();
    });
    expect(result.current.permissionState).toBe("denied");
    expect(result.current.error).toBe("Microphone permission denied");
  });

  it("sets error when no microphone found", async () => {
    const error = new Error("No microphone");
    error.name = "NotFoundError";
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue(error) },
      writable: true,
    });

    const { result } = renderHook(() => useAudioPermission());
    await act(async () => {
      await result.current.requestPermission();
    });
    expect(result.current.error).toBe("No microphone found");
  });
});
