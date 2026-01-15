/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Types
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  audioUrl?: string;
}

export type ConversationState = 'idle' | 'recording' | 'processing' | 'playing';

interface ConversationContextState {
  messages: Message[];
  conversationState: ConversationState;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}

// Actions
type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_STATE'; payload: ConversationState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: Partial<Message> };

// Initial State
const initialState: ConversationContextState = {
  messages: [],
  conversationState: 'idle',
  isLoading: false,
  error: null,
  sessionId: null,
};

// Reducer
function conversationReducer(
  state: ConversationContextState,
  action: Action
): ConversationContextState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'SET_STATE':
      return {
        ...state,
        conversationState: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      };
    case 'SET_SESSION_ID':
      return {
        ...state,
        sessionId: action.payload,
      };
    case 'UPDATE_LAST_MESSAGE': {
      if (state.messages.length === 0) return state;
      const updatedMessages = [...state.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...updatedMessages[updatedMessages.length - 1],
        ...action.payload,
      };
      return {
        ...state,
        messages: updatedMessages,
      };
    }
    default:
      return state;
  }
}

// Context Type
interface ConversationContextType extends ConversationContextState {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setConversationState: (state: ConversationState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  updateLastMessage: (update: Partial<Message>) => void;
}

// Context
const ConversationContext = createContext<ConversationContextType | null>(null);

// Provider
interface ConversationProviderProps {
  children: React.ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      },
    });
  }, []);

  const setConversationState = useCallback((newState: ConversationState) => {
    dispatch({ type: 'SET_STATE', payload: newState });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const setSessionId = useCallback((id: string) => {
    dispatch({ type: 'SET_SESSION_ID', payload: id });
  }, []);

  const updateLastMessage = useCallback((update: Partial<Message>) => {
    dispatch({ type: 'UPDATE_LAST_MESSAGE', payload: update });
  }, []);

  const value: ConversationContextType = {
    ...state,
    addMessage,
    setConversationState,
    setLoading,
    setError,
    clearMessages,
    setSessionId,
    updateLastMessage,
  };

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

// Hook
export function useConversation(): ConversationContextType {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}
