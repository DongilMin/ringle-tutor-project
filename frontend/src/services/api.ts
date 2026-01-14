const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

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

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return response.json();
}

export const membershipApi = {
  getCurrent: () => fetchApi<Membership>("/memberships/current"),

  getAll: () => fetchApi<Membership[]>("/memberships"),

  getById: (id: number) => fetchApi<Membership>(`/memberships/${id}`),
};

export const paymentApi = {
  create: (membershipType: string, paymentMethod: string) =>
    fetchApi<{ payment: Payment; membership: Membership }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        membership_type: membershipType,
        payment_method: paymentMethod,
      }),
    }),

  getAll: () => fetchApi<Payment[]>("/payments"),

  getById: (id: number) => fetchApi<Payment>(`/payments/${id}`),
};

export type { Membership, Payment, ApiResponse };
