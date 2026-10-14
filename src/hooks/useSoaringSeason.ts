import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type SoaringSeason = components['schemas']['SoaringSeason'];

/** `GET /reports/soaring-season` for one calendar year. */
export const useSoaringSeason = (year: number) => {
  const { accessToken } = useAuthStore();
  return useQuery<SoaringSeason>({
    queryKey: ['soaring-season', year],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/reports/soaring-season', {
        params: { query: { year } },
      });
      if (error) throw error;
      return data as SoaringSeason;
    },
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  });
};
