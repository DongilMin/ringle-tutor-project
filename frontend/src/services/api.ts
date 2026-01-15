import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: AxiosError): boolean => {
  // Retry on network errors or 5xx server errors
  if (!error.response) return true; // Network error
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AxiosError && !isRetryableError(error)) {
        throw error; // Don't retry client errors (4xx)
      }

      if (attempt < retries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

// Helper for Legacy API format
const handleResponse = async (request: Promise<{ data: unknown }>) => {
  try {
    const response = await request;
    return { success: true, data: response.data };
  } catch (error) {
    const err = error as {
      message: string;
      response?: { status: number; data?: { code?: string | number; message?: string } };
    };
    const code = err.response?.data?.code || err.response?.status;
    const message = err.response?.data?.message || err.message;
    return { success: false, error: { message, code } };
  }
};

// Types
export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
}

export interface MessageData {
  id: number;
  content: string;
  role: string;
  created_at: string;
  audio_url?: string;
}

export interface ConversationDetail {
  id: number;
  title: string;
  messages: MessageData[];
}

export interface AudioSendResponse {
  user_message: MessageData;
  assistant_message: MessageData;
  transcribed_text?: string;
  audio_url?: string;
  audio?: {
    data: string;
    content_type: string;
    duration?: number;
  };
}

// --- New Simple API (Used by new Pages) ---

export const checkMembership = async (userId?: number) => {
  try {
    const url = userId ? `/memberships/current?user_id=${userId}` : '/memberships/current';
    const response = await api.get(url);
    return response.data;
  } catch {
    return null;
  }
};

export type MembershipType = 'basic' | 'premium';

export const purchaseMembership = async (
  membershipType: MembershipType = 'premium',
  userId?: number
) => {
  const response = await api.post('/payments', {
    payment: {
      membership_type: membershipType,
      payment_method: 'credit_card',
      user_id: userId,
    },
  });
  return response.data;
};

export const createConversation = async (title: string) => {
  const response = await api.post('/conversations', { title });
  // Backend returns {success: true, data: {...}}, extract the data
  return response.data.data || response.data;
};

export const getConversation = async (id: string | number) => {
  const response = await api.get(`/conversations/${id}`);
  return response.data;
};

export const getMessages = async (id: string | number) => {
  const response = await api.get(`/conversations/${id}/messages`);
  return response.data;
};

export const sendTextMessage = async (conversationId: string | number, content: string) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    message: { content },
  });
  // Backend returns {success: true, data: {...}}, extract the data
  return response.data.data || response.data;
};

export const sendAudioMessage = async (conversationId: string | number, audioBlob: Blob) => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      try {
        const response = await api.post(`/conversations/${conversationId}/audio`, {
          audio: {
            data: base64Audio,
            content_type: audioBlob.type || 'audio/webm',
          },
        });
        // Backend returns { success: true, data: {...} }, extract the data
        resolve(response.data.data || response.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};

// --- Admin API ---

export interface AdminMembership {
  id: number;
  user_id: number;
  membership_type: string;
  status: string;
  start_date: string;
  end_date: string;
  features: string[];
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export const adminApi = {
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await api.get('/admin/users');
    return response.data.data || [];
  },
  getMemberships: async () => {
    const response = await api.get('/admin/memberships');
    return response.data.data || response.data;
  },
  createMembership: async (data: {
    user_id: number;
    membership_type: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.post('/admin/memberships', { membership: data });
    return response.data.data || response.data;
  },
  deleteMembership: async (id: number) => {
    const response = await api.delete(`/admin/memberships/${id}`);
    return response.data;
  },
};

// --- Legacy API (Used by Tests/Old Components) ---

export const membershipPlansApi = {
  getAll: () => handleResponse(api.get('/membership_plans')),
};

export const conversationApi = {
  create: () => handleResponse(api.post('/conversations', { title: 'New Session' })),
  getById: (id: number) => handleResponse(api.get(`/conversations/${id}`)),
  getMessages: (id: number) => handleResponse(api.get(`/conversations/${id}/messages`)),
  sendMessage: (id: number, content: string) =>
    handleResponse(api.post(`/conversations/${id}/messages`, { message: { content } })),
  sendAudio: async (id: number, blob: Blob, contentType: string) => {
    // Re-use logic or duplicate for now
    const reader = new FileReader();
    return new Promise<{ success: boolean; data?: unknown; error?: unknown }>((resolve) => {
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const response = await api.post(`/conversations/${id}/audio`, {
            audio: {
              data: base64Audio,
              content_type: contentType,
            },
          });
          resolve({ success: true, data: response.data });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          resolve({ success: false, error: { message } });
        }
      };
      reader.onerror = () => resolve({ success: false, error: { message: 'Read error' } });
      reader.readAsDataURL(blob);
    });
  },
};

export default api;
