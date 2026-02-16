import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClassRating, ClassRatingCreate, ClassRatingUpdate } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL as API_BASE } from '../lib/config';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

export const useClassRatings = (licenseId: string) => {
  return useQuery<ClassRating[]>({
    queryKey: ['classRatings', licenseId],
    queryFn: () => fetchWithAuth(`${API_BASE}/licenses/${licenseId}/ratings`),
    enabled: !!licenseId,
  });
};

export const useCreateClassRating = () => {
  const queryClient = useQueryClient();
  return useMutation<ClassRating, Error, { licenseId: string; data: ClassRatingCreate }>({
    mutationFn: ({ licenseId, data }) =>
      fetchWithAuth(`${API_BASE}/licenses/${licenseId}/ratings`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['classRatings', licenseId] });
    },
  });
};

export const useUpdateClassRating = () => {
  const queryClient = useQueryClient();
  return useMutation<ClassRating, Error, { licenseId: string; ratingId: string; data: ClassRatingUpdate }>({
    mutationFn: ({ licenseId, ratingId, data }) =>
      fetchWithAuth(`${API_BASE}/licenses/${licenseId}/ratings/${ratingId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['classRatings', licenseId] });
    },
  });
};

export const useDeleteClassRating = () => {
  const queryClient = useQueryClient();
  return useMutation<null, Error, { licenseId: string; ratingId: string }>({
    mutationFn: ({ licenseId, ratingId }) =>
      fetchWithAuth(`${API_BASE}/licenses/${licenseId}/ratings/${ratingId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['classRatings', licenseId] });
    },
  });
};
