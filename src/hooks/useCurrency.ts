import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Currency = components['schemas']['Currency'];

// Get currency status for a specific license
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
