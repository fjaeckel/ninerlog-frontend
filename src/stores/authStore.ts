import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, expiresIn: number) => void;
  updateTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken, expiresIn) => {
        set({
          user,
          accessToken,
          refreshToken,
          expiresIn,
          tokenExpiresAt: Date.now() + expiresIn * 1000,
          isAuthenticated: true,
        });
      },
      updateTokens: (accessToken, refreshToken, expiresIn) => {
        set({
          accessToken,
          refreshToken,
          expiresIn,
          tokenExpiresAt: Date.now() + expiresIn * 1000,
        });
      },
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user profile and authentication flag — tokens stay in memory only
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
