import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for Legacy API format
const handleResponse = async (request: Promise<any>) => {
  try {
    const response = await request;
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: error.response?.status } };
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
  transcribed_text: string;
  audio_url?: string;
}


// --- New Simple API (Used by new Pages) ---

export const checkMembership = async () => {
  try {
    const response = await api.get('/memberships/current');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const purchaseMembership = async () => {
  const response = await api.post('/payments', {
    payment: {
      membership_type: 'premium',
      payment_method: 'credit_card'
    }
  });
  return response.data;
};

export const createConversation = async (title: string) => {
  const response = await api.post('/conversations', { title });
  return response.data;
};

export const getConversation = async (id: string | number) => {
  const response = await api.get(`/conversations/${id}`);
  return response.data;
};

export const getMessages = async (id: string | number) => {
  const response = await api.get(`/conversations/${id}/messages`);
  return response.data;
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
            content_type: audioBlob.type || 'audio/webm'
          }
        });
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};


// --- Legacy API (Used by Tests/Old Components) ---

export const membershipPlansApi = {
  getAll: () => handleResponse(api.get('/membership_plans'))
};

export const conversationApi = {
  create: () => handleResponse(api.post('/conversations', { title: 'New Session' })),
  getById: (id: number) => handleResponse(api.get(`/conversations/${id}`)),
  getMessages: (id: number) => handleResponse(api.get(`/conversations/${id}/messages`)),
  sendMessage: (id: number, content: string) => handleResponse(api.post(`/conversations/${id}/messages`, { message: { content } })),
  sendAudio: async (id: number, blob: Blob, contentType: string) => {
    // Re-use logic or duplicate for now
    const reader = new FileReader();
    return new Promise<any>((resolve) => {
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            try {
                const response = await api.post(`/conversations/${id}/audio`, {
                    audio: {
                        data: base64Audio,
                        content_type: contentType
                    }
                });
                resolve({ success: true, data: response.data });
            } catch (err: any) {
                resolve({ success: false, error: { message: err.message } });
            }
        };
        reader.onerror = () => resolve({ success: false, error: { message: "Read error" } });
        reader.readAsDataURL(blob);
    });
  }
};

export default api;
