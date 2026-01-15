import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Conversation from '../../pages/Conversation';
import { ConversationProvider } from '../../context/ConversationContext';
import { UserProvider } from '../../context/UserContext';
import * as api from '../../services/api';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock user context with a test user who has conversation feature
const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

vi.mock('../../context/UserContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/UserContext')>();
  return {
    ...actual,
    useUser: () => ({
      currentUser: mockUser,
      membership: {
        id: 1,
        membership_type: 'premium',
        status: 'active',
        features: ['learning', 'conversation', 'analysis'],
        is_active: true,
        can_use_conversation: true,
      },
      isAdmin: false,
      isLoading: false,
      setCurrentUser: vi.fn(),
      setIsAdmin: vi.fn(),
      setMembership: vi.fn(),
      refreshMembership: vi.fn().mockResolvedValue(undefined),
      hasFeature: vi.fn().mockReturnValue(true),
      logout: vi.fn(),
    }),
    UserProvider: actual.UserProvider,
  };
});

// Mock the api
vi.mock('../../services/api', () => ({
  createConversation: vi.fn(),
  sendAudioMessage: vi.fn(),
  sendTextMessage: vi.fn(),
  checkMembership: vi.fn(),
  withRetry: vi.fn((fn) => fn()),
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

// Mock useAudioPermission hook
vi.mock('../../hooks/useAudioPermission', () => ({
  useAudioPermission: () => ({
    hasPermission: true,
    requestPermission: vi.fn().mockResolvedValue(true),
    checkPermission: vi.fn().mockResolvedValue(true),
  }),
}));

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <UserProvider>
        <ConversationProvider>{component}</ConversationProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

describe('Conversation Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while checking membership', async () => {
    vi.mocked(api.checkMembership).mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Conversation />);

    expect(screen.getByText('멤버십 확인 중...')).toBeInTheDocument();
  });

  it('shows error when no membership', async () => {
    vi.mocked(api.checkMembership).mockRejectedValue(new Error('No membership'));

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('접근 불가')).toBeInTheDocument();
    });
  });

  it('shows error when membership has no conversation credits', async () => {
    vi.mocked(api.checkMembership).mockResolvedValue({
      data: {
        status: 'active',
        can_use_conversation: false,
        is_usage_based: true,
        remaining_conversations: 0,
      },
    });

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('접근 불가')).toBeInTheDocument();
    });
  });

  it('renders conversation title when membership is valid', async () => {
    vi.mocked(api.checkMembership).mockResolvedValue({
      data: {
        status: 'active',
        can_use_conversation: true,
        is_usage_based: false,
      },
    });
    vi.mocked(api.createConversation).mockResolvedValue({
      id: 1,
      title: 'Test Session',
    });

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('Conversation Practice')).toBeInTheDocument();
    });
  });

  it('shows AI greeting message after session is created', async () => {
    vi.mocked(api.checkMembership).mockResolvedValue({
      data: {
        status: 'active',
        can_use_conversation: true,
      },
    });
    vi.mocked(api.createConversation).mockResolvedValue({
      id: 1,
      title: 'Test Session',
    });

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText(/Hello! I'm your AI English Tutor/)).toBeInTheDocument();
    });
  });

  it('shows remaining conversations for usage-based membership', async () => {
    vi.mocked(api.checkMembership).mockResolvedValue({
      data: {
        status: 'active',
        can_use_conversation: true,
        is_usage_based: true,
        remaining_conversations: 5,
      },
    });
    vi.mocked(api.createConversation).mockResolvedValue({
      id: 1,
      title: 'Test Session',
      meta: { remaining_conversations: 4 },
    });

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText(/남은 대화:/)).toBeInTheDocument();
    });
  });

  it('displays error when conversation creation fails', async () => {
    vi.mocked(api.checkMembership).mockResolvedValue({
      data: {
        status: 'active',
        can_use_conversation: true,
      },
    });
    vi.mocked(api.createConversation).mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'NO_CONVERSATION_CREDITS',
            message: 'No conversation credits remaining',
          },
        },
      },
    });

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('접근 불가')).toBeInTheDocument();
    });
  });

  it('shows purchase button on membership error', async () => {
    vi.mocked(api.checkMembership).mockRejectedValue(new Error('No membership'));

    renderWithProviders(<Conversation />);

    await waitFor(() => {
      expect(screen.getByText('멤버십 구매')).toBeInTheDocument();
    });
  });
});
