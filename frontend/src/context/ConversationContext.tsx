import React, { createContext, useContext, useReducer, useCallback } from "react";

// Types
export interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  audioUrl?: string;
}

export type ConversationState = "idle" | "recording" | "processing" | "playing";

interface ConversationContextState {
  messages: Message[];
  conversationState: ConversationState;
  isLoading: boolean;
  error: string | null;
}

type ConversationAction =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_STATE"; payload: ConversationState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_MESSAGES" }
  | { type: "REMOVE_MESSAGE"; payload: string };

interface ConversationContextValue extends ConversationContextState {
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  setConversationState: (state: ConversationState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  removeMessage: (id: string) => void;
}

// Initial state
const initialState: ConversationContextState = {
  messages: [],
  conversationState: "idle",
  isLoading: false,
  error: null,
};

// Reducer
function conversationReducer(
  state: ConversationContextState,
  action: ConversationAction
): ConversationContextState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_STATE":
      return { ...state, conversationState: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };
    case "REMOVE_MESSAGE":
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== action.payload),
      };
    default:
      return state;
  }
}

// Context
const ConversationContext = createContext<ConversationContextValue | null>(null);

// Provider
export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: newMessage });
    },
    []
  );

  const setConversationState = useCallback((conversationState: ConversationState) => {
    dispatch({ type: "SET_STATE", payload: conversationState });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: "CLEAR_MESSAGES" });
  }, []);

  const removeMessage = useCallback((id: string) => {
    dispatch({ type: "REMOVE_MESSAGE", payload: id });
  }, []);

  const value: ConversationContextValue = {
    ...state,
    addMessage,
    setConversationState,
    setLoading,
    setError,
    clearMessages,
    removeMessage,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

// Hook
export function useConversation(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}
