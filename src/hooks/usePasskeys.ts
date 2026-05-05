import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import i18n from '../i18n';
import type { components } from '../api/schema';

export type Passkey = components['schemas']['WebAuthnCredential'];

export const passkeysSupported = (): boolean => {
  try {
    return browserSupportsWebAuthn();
  } catch {
    return false;
  }
};

export const usePasskeys = () => {
  return useQuery({
    queryKey: ['passkeys'],
    queryFn: async (): Promise<Passkey[]> => {
      const { data, error } = await apiClient.GET('/auth/webauthn/credentials');
      if (error) throw error;
      return (data ?? []) as Passkey[];
    },
  });
};

export const useRegisterPasskey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (label?: string) => {
      // 1. Ask the server for the creation options
      const { data: options, error } = await apiClient.POST(
        '/auth/webauthn/register/options',
        // openapi-fetch requires a body even when there isn't one in the spec
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { body: undefined as any }
      );
      if (error || !options) throw error ?? new Error('No options returned');

      // 2. Run the browser ceremony
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attResponse = await startRegistration({ optionsJSON: options.publicKey as any });

      // 3. Send the attestation back for verification
      const verify = await apiClient.POST('/auth/webauthn/register/verify', {
        body: {
          sessionId: options.sessionId,
          label,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response: attResponse as any,
        },
      });
      if (verify.error) throw verify.error;
      return verify.data as Passkey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
  });
};

export const useDeletePasskey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentialId: string) => {
      const { error } = await apiClient.DELETE(
        '/auth/webauthn/credentials/{credentialId}',
        { params: { path: { credentialId } } }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
  });
};

export const useLoginWithPasskey = () => {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (params: { email?: string; conditional?: boolean } = {}) => {
      const { email, conditional } = params;

      const { data: options, error } = await apiClient.POST(
        '/auth/webauthn/login/options',
        { body: email ? { email } : {} }
      );
      if (error || !options) throw error ?? new Error('No options returned');

      const assertion = await startAuthentication({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        optionsJSON: options.publicKey as any,
        useBrowserAutofill: conditional,
      });

      const verify = await apiClient.POST('/auth/webauthn/login/verify', {
        body: {
          sessionId: options.sessionId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response: assertion as any,
        },
      });
      if (verify.error || !verify.data) throw verify.error ?? new Error('Login failed');
      return verify.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken, data.expiresIn);
      if (data.user?.preferredLocale && data.user.preferredLocale !== i18n.language) {
        i18n.changeLanguage(data.user.preferredLocale);
      }
    },
  });
};
