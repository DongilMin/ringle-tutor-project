import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Waveform } from '../../components/Waveform';

// Mock AudioContext
class MockAnalyserNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  getByteTimeDomainData = vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = 128;
    }
  });
}

class MockAudioContext {
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
  }));
  close = vi.fn();
}

describe('Waveform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  });

  it('renders canvas element', () => {
    render(<Waveform mediaStream={null} isRecording={false} />);

    const canvas = screen.getByTestId('waveform-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders with default dimensions', () => {
    render(<Waveform mediaStream={null} isRecording={false} />);

    const canvas = screen.getByTestId('waveform-canvas');
    expect(canvas).toHaveAttribute('width', '300');
    expect(canvas).toHaveAttribute('height', '100');
  });

  it('renders with custom dimensions', () => {
    render(<Waveform mediaStream={null} isRecording={false} width={400} height={150} />);

    const canvas = screen.getByTestId('waveform-canvas');
    expect(canvas).toHaveAttribute('width', '400');
    expect(canvas).toHaveAttribute('height', '150');
  });

  it('applies custom styling', () => {
    render(
      <Waveform mediaStream={null} isRecording={false} color="#ff0000" backgroundColor="#000000" />
    );

    const canvas = screen.getByTestId('waveform-canvas');
    expect(canvas.style.borderRadius).toBe('8px');
  });

  it('renders correctly when recording with stream', () => {
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream;

    render(<Waveform mediaStream={mockStream} isRecording={true} />);

    const canvas = screen.getByTestId('waveform-canvas');
    expect(canvas).toBeInTheDocument();
  });
});
