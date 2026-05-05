import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { components } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

type User = components['schemas']['User'];

// Update user profile (name/email)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { name?: string; email?: string; timeDisplayFormat?: string }): Promise<User> => {
      const { data: result, error } = await apiClient.PATCH('/users/me', {
        body: data as any,
      });
      if (error) throw error;
      return result as User;
    },
    onSuccess: (data) => {
      updateUser({ name: data.name, email: data.email, timeDisplayFormat: data.timeDisplayFormat as any });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

// Change password
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
      const { error } = await apiClient.POST('/auth/change-password', {
        body: data,
      });
      if (error) throw error;
    },
  });
};

// Delete account
export const useDeleteAccount = () => {
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (password: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/users/me', {
        body: { password } as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      clearAuth();
    },
  });
};

// Delete all flights
export const useDeleteAllFlights = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ deleted: number }> => {
      const { data, error } = await apiClient.DELETE('/flights/delete-all');
      if (error) throw error;
      return data as { deleted: number };
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
};

// Delete all user data (keeps account)
export const useDeleteAllUserData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      const { data, error } = await apiClient.DELETE('/users/me/data');
      if (error) throw error;
      return data as { message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};


