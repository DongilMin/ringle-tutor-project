import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Conversation from '../../pages/Conversation';
import * as conversationService from '../../services/conversationService';

// Mock the conversationService
vi.mock('../../services/conversationService', () => ({
  createSession: vi.fn(),
  sendAudioMessage: vi.fn(),
}));

// Mock useAudioRecorder hook
vi.mock('../../hooks/useAudioRecorder', () => ({
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

describe('Conversation Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversation title', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: true,
      conversationId: 1,
      messages: [],
    });

    render(<Conversation />);

    expect(screen.getByText('AI English Tutor')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: true,
      conversationId: 1,
      messages: [],
    });

    render(<Conversation />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows welcome message after session is created', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: true,
      conversationId: 1,
      messages: [],
    });

    render(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText(/Hello! I'm your AI English tutor/)).toBeInTheDocument();
    });
  });

  it('shows start recording button after initialization', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: true,
      conversationId: 1,
      messages: [],
    });

    render(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });
  });

  it('displays error when session creation fails', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: false,
      error: {
        code: 'SESSION_CREATE_FAILED',
        message: 'Failed to start conversation. Please try again.',
      },
    });

    render(<Conversation />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to start conversation. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('displays existing messages from restored session', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: true,
      conversationId: 1,
      messages: [
        {
          id: '1',
          content: 'Welcome back!',
          sender: 'ai',
          timestamp: new Date(),
        },
        {
          id: '2',
          content: 'Hello tutor',
          sender: 'user',
          timestamp: new Date(),
        },
      ],
    });

    render(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByText('Hello tutor')).toBeInTheDocument();
    });
  });

  it('shows retry button when error occurs', async () => {
    vi.mocked(conversationService.createSession).mockResolvedValue({
      success: false,
      error: {
        code: 'SESSION_CREATE_FAILED',
        message: 'Failed to start conversation. Please try again.',
      },
    });

    render(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
