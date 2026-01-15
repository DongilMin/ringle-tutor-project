import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ConversationProvider, useConversation } from '../../context/ConversationContext';

// Mock crypto.randomUUID
beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'test-uuid-1234',
  });
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConversationProvider>{children}</ConversationProvider>
);

describe('ConversationContext', () => {
  describe('initial state', () => {
    it('provides initial state values', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      expect(result.current.messages).toEqual([]);
      expect(result.current.conversationState).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sessionId).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('adds message with generated id and timestamp', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.addMessage({
          content: 'Hello',
          sender: 'user',
        });
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Hello');
      expect(result.current.messages[0].sender).toBe('user');
      expect(result.current.messages[0].id).toBe('test-uuid-1234');
      expect(result.current.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('adds multiple messages in order', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.addMessage({ content: 'Hello', sender: 'user' });
      });

      act(() => {
        result.current.addMessage({ content: 'Hi there!', sender: 'ai' });
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].sender).toBe('user');
      expect(result.current.messages[1].sender).toBe('ai');
    });
  });

  describe('setConversationState', () => {
    it('updates conversation state', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setConversationState('recording');
      });

      expect(result.current.conversationState).toBe('recording');
    });

    it('cycles through all states', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });
      const states = ['idle', 'recording', 'processing', 'playing'] as const;

      states.forEach((state) => {
        act(() => {
          result.current.setConversationState(state);
        });
        expect(result.current.conversationState).toBe(state);
      });
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('clears error when set to null', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setError('Error');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearMessages', () => {
    it('clears all messages', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.addMessage({ content: 'Hello', sender: 'user' });
        result.current.addMessage({ content: 'Hi', sender: 'ai' });
      });

      expect(result.current.messages).toHaveLength(2);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('setSessionId', () => {
    it('sets session id', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.setSessionId('session-123');
      });

      expect(result.current.sessionId).toBe('session-123');
    });
  });

  describe('updateLastMessage', () => {
    it('updates the last message', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.addMessage({ content: 'Processing...', sender: 'ai' });
      });

      act(() => {
        result.current.updateLastMessage({ content: 'Done!' });
      });

      expect(result.current.messages[0].content).toBe('Done!');
    });

    it('does nothing when no messages exist', () => {
      const { result } = renderHook(() => useConversation(), { wrapper });

      act(() => {
        result.current.updateLastMessage({ content: 'Update' });
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('useConversation hook', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useConversation());
      }).toThrow('useConversation must be used within a ConversationProvider');
    });
  });
});
