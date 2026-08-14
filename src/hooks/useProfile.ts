import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { components, operations } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

type User = components['schemas']['User'];

/**
 * Fresh profile from GET /users/me. The auth store is otherwise only fed by
 * the login/refresh payloads, so server-side changes (an admin edit, an OIDC
 * re-sync) never reached a running session. On success the store is updated
 * so the header and greeting reflect the server's view.
 */
export const useCurrentUser = () => {
  const { updateUser } = useAuthStore();
  const query = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async (): Promise<User> => {
      const { data, error } = await apiClient.GET('/users/me');
      if (error) throw error;
      return data as User;
    },
  });

  const { data } = query;
  useEffect(() => {
    if (data) {
      updateUser({ name: data.name, email: data.email, timeDisplayFormat: data.timeDisplayFormat as never });
    }
  }, [data, updateUser]);

  return query;
};

/** Everything PATCH /users/me accepts — identity fields and display preferences. */
type UpdateProfileRequest = NonNullable<
  operations['updateCurrentUser']['requestBody']
>['content']['application/json'];

// Update user profile (name/email/display preferences)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest): Promise<User> => {
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
    // Local mode confirms with the account password; OIDC mode has no local
    // password, so the API takes the account's own email typed out instead.
    mutationFn: async (confirmation: { password?: string; confirmEmail?: string }): Promise<void> => {
      const { error } = await apiClient.DELETE('/users/me', {
        body: confirmation as any,
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


