/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Membership {
  id: number;
  membership_type: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  features: string[];
  days_remaining: number;
  is_active: boolean;
  can_use_conversation: boolean;
}

interface UserContextState {
  currentUser: User | null;
  membership: Membership | null;
  isAdmin: boolean;
  isLoading: boolean;
}

interface UserContextValue extends UserContextState {
  setCurrentUser: (user: User | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setMembership: (membership: Membership | null) => void;
  refreshMembership: () => Promise<void>;
  hasFeature: (feature: 'learning' | 'conversation' | 'analysis') => boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMembership = useCallback(async () => {
    if (!currentUser || isAdmin) {
      setMembership(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/memberships/current?user_id=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setMembership(data.data || null);
      } else {
        setMembership(null);
      }
    } catch {
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser && !isAdmin) {
      refreshMembership();
    }
  }, [currentUser, isAdmin, refreshMembership]);

  const hasFeature = useCallback(
    (feature: 'learning' | 'conversation' | 'analysis') => {
      if (!membership || !membership.is_active) return false;
      return membership.features.includes(feature);
    },
    [membership]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setMembership(null);
    setIsAdmin(false);
  }, []);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        membership,
        isAdmin,
        isLoading,
        setCurrentUser,
        setIsAdmin,
        setMembership,
        refreshMembership,
        hasFeature,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
