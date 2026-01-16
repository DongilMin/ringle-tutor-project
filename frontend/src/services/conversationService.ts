import {
  conversationApi,
  type MessageData,
  type ConversationDetail,
  type AudioSendResponse,
} from './api';

// Error types for user-friendly messages
export type ConversationErrorCode =
  | 'SESSION_CREATE_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'AUDIO_UPLOAD_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'AI_RESPONSE_FAILED'
  | 'NETWORK_ERROR'
  | 'INVALID_AUDIO';

export interface ConversationError {
  code: ConversationErrorCode;
  message: string;
  details?: string;
}

// Convert API messages to UI format
export interface UIMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  audioUrl?: string;
}

function mapMessageToUI(message: MessageData): UIMessage {
  return {
    id: String(message.id),
    content: message.content,
    sender: message.role === 'user' ? 'user' : 'ai',
    timestamp: new Date(message.created_at),
    audioUrl: message.audio_url,
  };
}

// Create error with user-friendly message
function createError(code: ConversationErrorCode, details?: string): ConversationError {
  const messages: Record<ConversationErrorCode, string> = {
    SESSION_CREATE_FAILED: 'Failed to start conversation. Please try again.',
    SESSION_NOT_FOUND: 'Conversation not found. Please start a new session.',
    AUDIO_UPLOAD_FAILED: 'Failed to send audio. Please check your recording and try again.',
    TRANSCRIPTION_FAILED: 'Could not understand your speech. Please speak clearly and try again.',
    AI_RESPONSE_FAILED: 'AI tutor is currently unavailable. Please try again later.',
    NETWORK_ERROR: 'Network connection lost. Please check your internet and try again.',
    INVALID_AUDIO: 'Invalid audio format. Please try recording again.',
  };

  return {
    code,
    message: messages[code],
    details,
  };
}

// Session management
export async function createSession(): Promise<
  | {
      success: true;
      conversationId: number;
      messages: UIMessage[];
    }
  | {
      success: false;
      error: ConversationError;
    }
> {
  const response = await conversationApi.create();

  if (!response.success || !response.data) {
    return {
      success: false,
      error: createError('SESSION_CREATE_FAILED', (response.error as any)?.message),
    };
  }

  const conversation = response.data as ConversationDetail;
  return {
    success: true,
    conversationId: conversation.id,
    messages: conversation.messages ? conversation.messages.map(mapMessageToUI) : [],
  };
}

// Restore existing session
export async function restoreSession(conversationId: number): Promise<
  | {
      success: true;
      conversation: ConversationDetail;
      messages: UIMessage[];
    }
  | {
      success: false;
      error: ConversationError;
    }
> {
  const response = await conversationApi.getById(conversationId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: createError('SESSION_NOT_FOUND', (response.error as any)?.message),
    };
  }

  const conversation = response.data as ConversationDetail;
  return {
    success: true,
    conversation,
    messages: conversation.messages ? conversation.messages.map(mapMessageToUI) : [],
  };
}

// Send audio and get AI response
export async function sendAudioMessage(
  conversationId: number,
  audioBlob: Blob,
  contentType: string
): Promise<
  | {
      success: true;
      userMessage: UIMessage;
      assistantMessage: UIMessage;
      transcribedText: string;
      audioUrl?: string;
    }
  | {
      success: false;
      error: ConversationError;
    }
> {
  // Validate audio blob
  if (!audioBlob || audioBlob.size === 0) {
    return {
      success: false,
      error: createError('INVALID_AUDIO', 'Audio recording is empty'),
    };
  }

  const response = await conversationApi.sendAudio(conversationId, audioBlob, contentType);

  if (!response.success || !response.data) {
    const errorCode = (response.error as any)?.code;

    // Map specific error codes to user-friendly errors
    if (errorCode === 'TRANSCRIPTION_FAILED') {
      return {
        success: false,
        error: createError('TRANSCRIPTION_FAILED', (response.error as any)?.message),
      };
    }

    if (errorCode === 'NETWORK_ERROR') {
      return {
        success: false,
        error: createError('NETWORK_ERROR', (response.error as any)?.message),
      };
    }

    return {
      success: false,
      error: createError('AUDIO_UPLOAD_FAILED', (response.error as any)?.message),
    };
  }

  const data: AudioSendResponse = response.data as AudioSendResponse;

  return {
    success: true,
    userMessage: mapMessageToUI(data.user_message),
    assistantMessage: mapMessageToUI(data.assistant_message),
    transcribedText: data.transcribed_text || '',
    audioUrl: data.audio_url,
  };
}

// Send text message (for testing/fallback)
export async function sendTextMessage(
  conversationId: number,
  content: string
): Promise<
  | {
      success: true;
      userMessage: UIMessage;
      assistantMessage: UIMessage;
    }
  | {
      success: false;
      error: ConversationError;
    }
> {
  const response = await conversationApi.sendMessage(conversationId, content);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: createError('AI_RESPONSE_FAILED', (response.error as any)?.message),
    };
  }

  const data = response.data as { user_message: MessageData; assistant_message: MessageData };

  return {
    success: true,
    userMessage: mapMessageToUI(data.user_message),
    assistantMessage: mapMessageToUI(data.assistant_message),
  };
}

// Get conversation history
export async function getConversationHistory(conversationId: number): Promise<
  | {
      success: true;
      messages: UIMessage[];
    }
  | {
      success: false;
      error: ConversationError;
    }
> {
  const response = await conversationApi.getMessages(conversationId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: createError('SESSION_NOT_FOUND', (response.error as any)?.message),
    };
  }

  const messages = response.data as MessageData[];

  return {
    success: true,
    messages: Array.isArray(messages) ? messages.map(mapMessageToUI) : [],
  };
}
