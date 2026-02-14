import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useLicenseStore } from '../stores/licenseStore';
import type { components } from '../api/schema';

type User = components['schemas']['User'];

// Update user profile (name/email)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { name?: string; email?: string }): Promise<User> => {
      const { data: result, error } = await apiClient.PATCH('/users/me', {
        body: data as any,
      });
      if (error) throw error;
      return result as User;
    },
    onSuccess: (data) => {
      updateUser({ name: data.name, email: data.email });
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

// Set default license
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const useSetDefaultLicense = () => {
  const { updateUser } = useAuthStore();
  const { setDefaultLicenseId } = useLicenseStore();

  return useMutation({
    mutationFn: async (licenseId: string): Promise<{ defaultLicenseId: string }> => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE}/users/me/default-license`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ licenseId }),
      });
      if (!res.ok) throw new Error('Failed to set default license');
      return res.json();
    },
    onSuccess: (data) => {
      updateUser({ defaultLicenseId: data.defaultLicenseId });
      setDefaultLicenseId(data.defaultLicenseId);
    },
  });
};
