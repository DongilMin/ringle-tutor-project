import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSession,
  sendAudioMessage,
  sendTextMessage,
  getConversationHistory,
} from '../../services/conversationService';
import { conversationApi } from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  conversationApi: {
    create: vi.fn(),
    getById: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    sendAudio: vi.fn(),
  },
}));

describe('conversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a new conversation session successfully', async () => {
      const mockConversation = {
        id: 1,
        status: 'active',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        messages: [
          {
            id: 1,
            role: 'assistant' as const,
            content: 'Welcome!',
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
      };

      vi.mocked(conversationApi.create).mockResolvedValue({
        success: true,
        data: { conversation: mockConversation },
      });

      const result = await createSession();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.conversationId).toBe(1);
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].content).toBe('Welcome!');
        expect(result.messages[0].sender).toBe('ai');
      }
    });

    it('returns error when session creation fails', async () => {
      vi.mocked(conversationApi.create).mockResolvedValue({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Internal error' },
      });

      const result = await createSession();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SESSION_CREATE_FAILED');
      }
    });
  });

  describe('sendAudioMessage', () => {
    it('sends audio and returns transcribed text with AI response', async () => {
      const mockResponse = {
        user_message: {
          id: 2,
          role: 'user' as const,
          content: 'Hello, how are you?',
          created_at: '2024-01-15T10:01:00Z',
        },
        transcribed_text: 'Hello, how are you?',
        assistant_message: {
          id: 3,
          role: 'assistant' as const,
          content: "I'm doing well, thank you!",
          created_at: '2024-01-15T10:01:01Z',
        },
        audio_url: 'http://example.com/audio.mp3',
      };

      vi.mocked(conversationApi.sendAudio).mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const result = await sendAudioMessage(1, audioBlob, 'audio/webm');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.transcribedText).toBe('Hello, how are you?');
        expect(result.userMessage.content).toBe('Hello, how are you?');
        expect(result.assistantMessage.content).toBe("I'm doing well, thank you!");
        expect(result.audioUrl).toBe('http://example.com/audio.mp3');
      }
    });

    it('returns error for empty audio blob', async () => {
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const result = await sendAudioMessage(1, emptyBlob, 'audio/webm');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_AUDIO');
      }
    });

    it('returns transcription error when speech not understood', async () => {
      vi.mocked(conversationApi.sendAudio).mockResolvedValue({
        success: false,
        error: { code: 'TRANSCRIPTION_FAILED', message: 'Could not transcribe' },
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const result = await sendAudioMessage(1, audioBlob, 'audio/webm');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TRANSCRIPTION_FAILED');
      }
    });
  });

  describe('sendTextMessage', () => {
    it('sends text message and returns AI response', async () => {
      const mockResponse = {
        user_message: {
          id: 2,
          role: 'user' as const,
          content: 'Hello',
          created_at: '2024-01-15T10:01:00Z',
        },
        assistant_message: {
          id: 3,
          role: 'assistant' as const,
          content: 'Hi there!',
          created_at: '2024-01-15T10:01:01Z',
        },
      };

      vi.mocked(conversationApi.sendMessage).mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await sendTextMessage(1, 'Hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userMessage.content).toBe('Hello');
        expect(result.assistantMessage.content).toBe('Hi there!');
      }
    });
  });

  describe('getConversationHistory', () => {
    it('retrieves conversation messages', async () => {
      const mockMessages = [
        {
          id: 1,
          role: 'assistant' as const,
          content: 'Welcome!',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          role: 'user' as const,
          content: 'Hello',
          created_at: '2024-01-15T10:01:00Z',
        },
      ];

      vi.mocked(conversationApi.getMessages).mockResolvedValue({
        success: true,
        data: { messages: mockMessages },
      });

      const result = await getConversationHistory(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toHaveLength(2);
        expect(result.messages[0].sender).toBe('ai');
        expect(result.messages[1].sender).toBe('user');
      }
    });
  });
});
