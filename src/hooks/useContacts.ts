import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Contact, ContactCreate } from '../types/api';
import { API_BASE_URL as API_BASE } from '../lib/config';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { useAuthStore } = await import('../stores/authStore');
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

export const useContacts = () => {
  return useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: () => fetchWithAuth(`${API_BASE}/contacts`),
  });
};

export const useSearchContacts = (query: string) => {
  return useQuery<Contact[]>({
    queryKey: ['contacts', 'search', query],
    queryFn: () => fetchWithAuth(`${API_BASE}/contacts/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation<Contact, Error, ContactCreate>({
    mutationFn: (data) =>
      fetchWithAuth(`${API_BASE}/contacts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  return useMutation<null, Error, string>({
    mutationFn: (id) =>
      fetchWithAuth(`${API_BASE}/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};
