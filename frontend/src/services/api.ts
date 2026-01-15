const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Helper function to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface Membership {
  id: number;
  membership_type: string;
  status: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  days_remaining: number;
}

interface Payment {
  id: number;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  membership?: Membership;
}

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || {
          code: `HTTP_${response.status}`,
          message: `Request failed with status ${response.status}`,
        },
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

export const membershipPlansApi = {
  getAll: () => fetchApi<MembershipPlan[]>('/membership_plans'),
};

export const membershipApi = {
  getCurrent: () => fetchApi<Membership>('/memberships/current'),

  getAll: () => fetchApi<Membership[]>('/memberships'),

  getById: (id: number) => fetchApi<Membership>(`/memberships/${id}`),
};

export const paymentApi = {
  create: (membershipType: string, paymentMethod: string) =>
    fetchApi<{ payment: Payment; membership: Membership }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        membership_type: membershipType,
        payment_method: paymentMethod,
      }),
    }),

  getAll: () => fetchApi<Payment[]>('/payments'),

  getById: (id: number) => fetchApi<Payment>(`/payments/${id}`),
};

// Conversation Types
interface ConversationSummary {
  id: number;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface MessageData {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  audio_duration?: number;
  created_at: string;
}

interface ConversationDetail {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  messages: MessageData[];
}

interface SendMessageResponse {
  user_message: MessageData;
  assistant_message: MessageData;
  audio_url?: string;
  audio_duration?: number;
}

interface AudioSendResponse {
  user_message: MessageData;
  transcribed_text: string;
  assistant_message: MessageData;
  audio_url?: string;
  audio_duration?: number;
}

export const conversationApi = {
  // Create a new conversation
  create: () =>
    fetchApi<ConversationSummary & { messages?: MessageData[] }>('/conversations', {
      method: 'POST',
    }),

  // Get all conversations
  getAll: () => fetchApi<ConversationSummary[]>('/conversations'),

  // Get a specific conversation
  getById: (id: number) => fetchApi<ConversationDetail>(`/conversations/${id}`),

  // Get messages for a conversation
  getMessages: (id: number) => fetchApi<MessageData[]>(`/conversations/${id}/messages`),

  // Send a text message
  sendMessage: (conversationId: number, content: string) =>
    fetchApi<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Send an audio message (converts blob to base64)
  sendAudio: async (conversationId: number, audioBlob: Blob, contentType: string) => {
    const base64Data = await blobToBase64(audioBlob);
    return fetchApi<AudioSendResponse>(`/conversations/${conversationId}/audio`, {
      method: 'POST',
      body: JSON.stringify({
        audio: {
          data: base64Data,
          content_type: contentType,
        },
      }),
    });
  },
};

export type {
  Membership,
  Payment,
  MembershipPlan,
  ApiResponse,
  ConversationSummary,
  ConversationDetail,
  MessageData,
  SendMessageResponse,
  AudioSendResponse,
};
