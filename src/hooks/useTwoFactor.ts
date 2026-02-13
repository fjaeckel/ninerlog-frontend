import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type TwoFactorSetup = components['schemas']['TwoFactorSetup'];
type TwoFactorEnabled = components['schemas']['TwoFactorEnabled'];
type AuthResponse = components['schemas']['AuthResponse'];

export const useSetup2FA = () => {
  return useMutation({
    mutationFn: async (): Promise<TwoFactorSetup> => {
      const { data, error } = await apiClient.POST('/auth/2fa/setup');
      if (error) throw error;
      return data as TwoFactorSetup;
    },
  });
};

export const useVerify2FA = () => {
  return useMutation({
    mutationFn: async (code: string): Promise<TwoFactorEnabled> => {
      const { data, error } = await apiClient.POST('/auth/2fa/verify', {
        body: { code } as any,
      });
      if (error) throw error;
      return data as TwoFactorEnabled;
    },
  });
};

export const useDisable2FA = () => {
  return useMutation({
    mutationFn: async (password: string): Promise<void> => {
      const { error } = await apiClient.POST('/auth/2fa/disable', {
        body: { password } as any,
      });
      if (error) throw error;
    },
  });
};

export const useLogin2FA = () => {
  return useMutation({
    mutationFn: async ({ twoFactorToken, code }: { twoFactorToken: string; code: string }): Promise<AuthResponse> => {
      const { data, error } = await apiClient.POST('/auth/2fa/login', {
        body: { twoFactorToken, code } as any,
      });
      if (error) throw error;
      return data as AuthResponse;
    },
  });
};
