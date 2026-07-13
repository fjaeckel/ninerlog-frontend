import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL } from '../lib/config';
import type { components } from '../api/schema';

type FlightSignature = components['schemas']['FlightSignature'];
type SignatureRequestCreated = components['schemas']['SignatureRequestCreated'];
type PublicSignatureInfo = components['schemas']['PublicSignatureInfo'];

function invalidateFlightAndSignatures(queryClient: ReturnType<typeof useQueryClient>, flightId: string) {
  queryClient.invalidateQueries({ queryKey: ['flights', flightId] });
  queryClient.invalidateQueries({ queryKey: ['flightSignatures', flightId] });
}

// ---- Authenticated (owner) hooks ----

export const useFlightSignatures = (flightId: string) => {
  return useQuery({
    queryKey: ['flightSignatures', flightId],
    queryFn: async (): Promise<FlightSignature[]> => {
      const { data, error } = await apiClient.GET('/flights/{flightId}/signatures', {
        params: { path: { flightId } },
      });
      if (error) throw error;
      return data as FlightSignature[];
    },
    enabled: !!flightId,
  });
};

export const useSignFlightLive = (flightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { signerName: string; credentialNumber?: string | null; signatureImage: string }): Promise<FlightSignature> => {
      const { data, error } = await apiClient.POST('/flights/{flightId}/signatures/live', {
        params: { path: { flightId } },
        body,
      });
      if (error) throw error;
      return data as FlightSignature;
    },
    onSuccess: () => invalidateFlightAndSignatures(queryClient, flightId),
  });
};

export const useCreateSignatureRequest = (flightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { instructorEmail?: string | null; expiresInHours?: number | null }): Promise<SignatureRequestCreated> => {
      const { data, error } = await apiClient.POST('/flights/{flightId}/signatures', {
        params: { path: { flightId } },
        body: { instructorEmail: body.instructorEmail ?? null, expiresInHours: body.expiresInHours ?? null },
      });
      if (error) throw error;
      return data as SignatureRequestCreated;
    },
    onSuccess: () => invalidateFlightAndSignatures(queryClient, flightId),
  });
};

export const useResendSignatureRequest = (flightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ signatureId, instructorEmail }: { signatureId: string; instructorEmail?: string | null }): Promise<SignatureRequestCreated> => {
      const { data, error } = await apiClient.POST('/flights/{flightId}/signatures/{signatureId}/resend', {
        params: { path: { flightId, signatureId } },
        body: { instructorEmail: instructorEmail ?? null },
      });
      if (error) throw error;
      return data as SignatureRequestCreated;
    },
    onSuccess: () => invalidateFlightAndSignatures(queryClient, flightId),
  });
};

export const useRevokeSignatureRequest = (flightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (signatureId: string): Promise<FlightSignature> => {
      const { data, error } = await apiClient.POST('/flights/{flightId}/signatures/{signatureId}/revoke', {
        params: { path: { flightId, signatureId } },
      });
      if (error) throw error;
      return data as FlightSignature;
    },
    onSuccess: () => invalidateFlightAndSignatures(queryClient, flightId),
  });
};

export const useVoidFlightSignature = (flightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ signatureId, reason }: { signatureId: string; reason: string }): Promise<FlightSignature> => {
      const { data, error } = await apiClient.POST('/flights/{flightId}/signatures/{signatureId}/void', {
        params: { path: { flightId, signatureId } },
        body: { reason },
      });
      if (error) throw error;
      return data as FlightSignature;
    },
    onSuccess: () => invalidateFlightAndSignatures(queryClient, flightId),
  });
};

/**
 * Fetches the signature image as an authenticated blob and returns an
 * object URL — a plain <img src> can't attach the Authorization header, so
 * this can't go through apiClient's typed GET (which also assumes JSON).
 * Caller owns revoking the previous URL; this hook revokes on unmount/change.
 */
export const useFlightSignatureImageUrl = (flightId: string, signatureId: string | null | undefined) => {
  return useQuery({
    queryKey: ['flightSignatureImage', flightId, signatureId],
    queryFn: async (): Promise<string> => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE_URL}/flights/${flightId}/signatures/${signatureId}/image`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load signature image');
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
    enabled: !!flightId && !!signatureId,
    staleTime: Infinity,
    gcTime: 0,
  });
};

// ---- Public (unauthenticated, token-based) hooks ----

export const usePublicSignatureInfo = (token: string | null) => {
  return useQuery({
    queryKey: ['publicSignatureInfo', token],
    queryFn: async (): Promise<PublicSignatureInfo> => {
      const { data, error } = await apiClient.GET('/sign/{token}', {
        params: { path: { token: token! } },
      });
      if (error) throw error;
      return data as PublicSignatureInfo;
    },
    enabled: !!token,
    retry: false,
  });
};

export const useCompletePublicSignature = (token: string | null) => {
  return useMutation({
    mutationFn: async (body: { signerName: string; credentialNumber?: string | null; signatureImage: string }): Promise<{ message: string }> => {
      const { data, error } = await apiClient.POST('/sign/{token}', {
        params: { path: { token: token! } },
        body,
      });
      if (error) throw error;
      return data as { message: string };
    },
  });
};
