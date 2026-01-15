import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  checkMembership: vi.fn(),
  createConversation: vi.fn(),
  sendAudioMessage: vi.fn(),
  sendTextMessage: vi.fn(),
  purchaseMembership: vi.fn(),
}));

// Mock useAudioRecorder hook
vi.mock('../hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    state: 'idle',
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    resetRecording: vi.fn(),
    error: null,
    mediaStream: null,
  }),
}));

// Mock useAudioPermission hook
vi.mock('../hooks/useAudioPermission', () => ({
  useAudioPermission: () => ({
    hasPermission: true,
    requestPermission: vi.fn().mockResolvedValue(true),
    checkPermission: vi.fn().mockResolvedValue(true),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.checkMembership).mockResolvedValue(null);
  });

  it('renders home page by default', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ringle AI Tutor')).toBeInTheDocument();
    });
  });

  it('renders user and admin login options', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('유저로 접속')).toBeInTheDocument();
      expect(screen.getByText('어드민으로 접속')).toBeInTheDocument();
    });
  });
});
