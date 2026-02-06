import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, expiresIn: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken, expiresIn) => {
        set({ user, accessToken, refreshToken, expiresIn, isAuthenticated: true });
      },
      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null, expiresIn: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
