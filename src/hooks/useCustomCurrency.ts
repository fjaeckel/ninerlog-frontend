import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL as API_BASE } from '../lib/config';
import type {
  CustomCurrencyRule,
  CustomCurrencyEvaluation,
  CustomCurrencyRuleBody,
  CustomRuleInput,
  CustomRuleWithStatus,
  SharedRuleView,
} from '../types/customCurrency';

const BASE = `${API_BASE}/custom-currency`;

/** authedFetch performs a JSON request with the bearer token and surfaces the
 *  API's error message (used for validation feedback in the builder). */
async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const QUERY_KEY = ['custom-currency'];

export const useCustomCurrencies = () => {
  const { accessToken } = useAuthStore();
  return useQuery<CustomRuleWithStatus[]>({
    queryKey: QUERY_KEY,
    queryFn: () => authedFetch<CustomRuleWithStatus[]>(''),
    enabled: !!accessToken,
  });
};

export const useCreateCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomRuleInput) =>
      authedFetch<CustomRuleWithStatus>('', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useUpdateCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomRuleInput }) =>
      authedFetch<CustomRuleWithStatus>(`/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useDeleteCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authedFetch<void>(`/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

/** Evaluate an unsaved definition for the live preview. */
export const usePreviewCustomCurrency = () =>
  useMutation({
    mutationFn: (definition: CustomCurrencyRuleBody) =>
      authedFetch<CustomCurrencyEvaluation>('/preview', {
        method: 'POST',
        body: JSON.stringify({ definition }),
      }),
  });

export const useSetEnabledCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      authedFetch<CustomRuleWithStatus>(`/${id}/enabled`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSetNotifyCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notify }: { id: string; notify: boolean }) =>
      authedFetch<CustomRuleWithStatus>(`/${id}/notify`, {
        method: 'PUT',
        body: JSON.stringify({ notify }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSetShareCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      authedFetch<CustomCurrencyRule>(`/${id}/share`, { method: shared ? 'POST' : 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSharedRule = (token: string | null) => {
  const { accessToken } = useAuthStore();
  return useQuery<SharedRuleView>({
    queryKey: ['custom-currency', 'shared', token],
    queryFn: () => authedFetch<SharedRuleView>(`/shared/${encodeURIComponent(token as string)}`),
    enabled: !!accessToken && !!token,
    retry: false,
  });
};

export const useImportSharedRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      authedFetch<CustomRuleWithStatus>(`/shared/${encodeURIComponent(token)}/import`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
