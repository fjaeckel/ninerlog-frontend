import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

export interface MonthlyTrend {
  month: string;
  totalFlights: number;
  totalHours: number;
  picHours: number;
  dualHours: number;
  nightHours: number;
  ifrHours: number;
  landingsDay: number;
  landingsNight: number;
}

export interface AircraftBreakdown {
  aircraftType: string;
  totalFlights: number;
  totalHours: number;
}

export interface TrendsData {
  monthly: MonthlyTrend[];
  byAircraftType: AircraftBreakdown[];
}

import { API_BASE_URL } from '../lib/config';

export const useTrends = (months: number = 12) => {
  return useQuery({
    queryKey: ['trends', months],
    queryFn: async (): Promise<TrendsData> => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE_URL}/reports/trends?months=${months}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
  });
};
