import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
    // Mock constructor - parameters intentionally unused
  }

  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  });
  pause = vi.fn(() => {
    this.state = 'paused';
  });
  resume = vi.fn(() => {
    this.state = 'recording';
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static isTypeSupported(_mimeType: string): boolean {
    return true;
  }
}

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MediaRecorder
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    // Mock getUserMedia
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      writable: true,
    });

    // Mock URL.createObjectURL
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:test-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.state).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.duration).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('starts recording and updates state', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('recording');
    expect(result.current.mediaStream).not.toBeNull();
  });

  it('stops recording and creates audio blob', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.state).toBe('stopped');
    expect(result.current.audioBlob).not.toBeNull();
    expect(result.current.audioUrl).toBe('blob:test-url');
  });

  it('resets recording state', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    act(() => {
      result.current.resetRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.duration).toBe(0);
  });

  it('handles errors during recording', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      writable: true,
    });

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBe('Permission denied');
  });

  describe('pause and resume', () => {
    it('pauses recording and updates state', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.state).toBe('paused');
    });

    it('resumes recording after pause', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.pauseRecording();
      });

      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.state).toBe('recording');
    });

    it('maintains duration after pause and resume', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Advance time by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      const durationBeforePause = result.current.duration;

      act(() => {
        result.current.pauseRecording();
      });

      // Advance time while paused - duration should not increase
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        result.current.resumeRecording();
      });

      // Duration should be same as before pause (or close)
      expect(result.current.duration).toBe(durationBeforePause);

      vi.useRealTimers();
    });
  });

  describe('VAD (Voice Activity Detection)', () => {
    it('initializes with default VAD config', () => {
      const { result } = renderHook(() => useAudioRecorder());

      expect(result.current.vadConfig).toEqual({
        enabled: true,
        silenceThreshold: 15,
        silenceDuration: 1500,
        minRecordingTime: 1000,
        maxRecordingTime: 60000,
      });
    });

    it('accepts custom VAD config', () => {
      const customConfig = {
        enabled: false,
        silenceThreshold: 30,
        silenceDuration: 2000,
      };

      const { result } = renderHook(() => useAudioRecorder(customConfig));

      expect(result.current.vadConfig.enabled).toBe(false);
      expect(result.current.vadConfig.silenceThreshold).toBe(30);
      expect(result.current.vadConfig.silenceDuration).toBe(2000);
    });

    it('allows updating VAD config', () => {
      const { result } = renderHook(() => useAudioRecorder());

      act(() => {
        result.current.setVADConfig({ silenceThreshold: 50 });
      });

      expect(result.current.vadConfig.silenceThreshold).toBe(50);
      // Other values should remain unchanged
      expect(result.current.vadConfig.enabled).toBe(true);
    });

    it('initializes audioLevel at 0', () => {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.audioLevel).toBe(0);
    });

    it('initializes isVADActive as false', () => {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.isVADActive).toBe(false);
    });

    it('resets audioLevel to 0 after resetRecording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      act(() => {
        result.current.resetRecording();
      });

      expect(result.current.audioLevel).toBe(0);
      expect(result.current.isVADActive).toBe(false);
    });
  });

  describe('memory leak prevention', () => {
    it('revokes previous audio URL when starting new recording', async () => {
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:test-url'),
        revokeObjectURL,
      });

      const { result } = renderHook(() => useAudioRecorder());

      // First recording
      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      // Second recording should revoke the first URL
      await act(async () => {
        await result.current.startRecording();
      });

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('revokes audio URL on resetRecording', async () => {
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:test-url'),
        revokeObjectURL,
      });

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      act(() => {
        result.current.resetRecording();
      });

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('stops all media tracks when recording stops', async () => {
      const stopTrack = vi.fn();
      const mockStream = {
        getTracks: () => [{ stop: stopTrack }, { stop: stopTrack }],
      };
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        writable: true,
      });

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      expect(stopTrack).toHaveBeenCalledTimes(2);
    });
  });
});
