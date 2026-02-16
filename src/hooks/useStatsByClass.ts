import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
