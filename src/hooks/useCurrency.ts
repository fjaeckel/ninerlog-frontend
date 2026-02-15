import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';
import type { CurrencyStatusResponse } from '../types/api';
import { useAuthStore } from '../stores/authStore';

type Currency = components['schemas']['Currency'];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Get currency status for a specific license (legacy per-license endpoint)
export const useLicenseCurrency = (licenseId: string) => {
  return useQuery({
    queryKey: ['currency', licenseId],
    queryFn: async (): Promise<Currency> => {
      const { data, error } = await apiClient.GET('/licenses/{licenseId}/currency', {
        params: { path: { licenseId } },
      });
      if (error) throw error;
      return data as Currency;
    },
    enabled: !!licenseId,
  });
};

// Get currency status for ALL class ratings across all licenses
export const useAllCurrencyStatus = () => {
  const { accessToken } = useAuthStore();

  return useQuery<CurrencyStatusResponse>({
    queryKey: ['currency', 'all'],
    queryFn: async (): Promise<CurrencyStatusResponse> => {
      const res = await fetch(`${API_BASE}/currency`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to fetch currency status');
      }
      return res.json();
    },
    enabled: !!accessToken,
  });
};
