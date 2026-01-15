const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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

async function fetchApiWithFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
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

export const conversationApi = {
  // Create a new conversation
  create: () =>
    fetchApi<{ conversation: ConversationDetail }>('/conversations', {
      method: 'POST',
    }),

  // Get all conversations
  getAll: () => fetchApi<{ conversations: ConversationSummary[] }>('/conversations'),

  // Get a specific conversation
  getById: (id: number) => fetchApi<{ conversation: ConversationDetail }>(`/conversations/${id}`),

  // Get messages for a conversation
  getMessages: (id: number) =>
    fetchApi<{ messages: MessageData[] }>(`/conversations/${id}/messages`),

  // Send a text message
  sendMessage: (conversationId: number, content: string) =>
    fetchApi<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Send an audio message
  sendAudio: (conversationId: number, audioBlob: Blob, contentType: string) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${contentType.split('/')[1] || 'webm'}`);
    formData.append('content_type', contentType);
    return fetchApiWithFormData<AudioSendResponse>(
      `/conversations/${conversationId}/audio`,
      formData
    );
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
