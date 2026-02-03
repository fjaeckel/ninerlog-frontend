import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../lib/api';

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface ResetPasswordData {
  email: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const useRegister = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
};

export const useLogin = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginData): Promise<AuthResponse> => {
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
};

export const useLogout = () => {
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Optional: Call logout endpoint if you have one
      // await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      clearAuth();
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await apiClient.post('/auth/reset-password', data);
      return response.data;
    },
  });
};
