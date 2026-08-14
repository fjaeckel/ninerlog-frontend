import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';

interface ClassStat {
  class: string;
  flights: number;
  minutes: number;
  picMinutes: number;
  landings: number;
}

interface AuthorityStat {
  authority: string;
  licenseType: string;
  flights: number;
  minutes: number;
}

export interface StatsByClassResponse {
  byClass: ClassStat[];
  byAuthority: AuthorityStat[];
}

export const useStatsByClass = () => {
  const { accessToken } = useAuthStore();

  return useQuery<StatsByClassResponse>({
    queryKey: ['stats', 'by-class'],
    queryFn: async (): Promise<StatsByClassResponse> => {
      const { data, error } = await apiClient.GET('/reports/stats-by-class', {
        params: { query: { months: 0 } },
      });
      if (error) throw error;
      return data as StatsByClassResponse;
    },
    enabled: !!accessToken,
  });
};
