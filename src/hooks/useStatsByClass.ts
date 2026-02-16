import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL as API_BASE } from '../lib/config';

interface ClassStat {
  class: string;
  flights: number;
  hours: number;
  picHours: number;
  landings: number;
}

interface AuthorityStat {
  authority: string;
  licenseType: string;
  flights: number;
  hours: number;
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
      const res = await fetch(`${API_BASE}/reports/stats-by-class`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!accessToken,
  });
};
