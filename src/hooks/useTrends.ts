import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { operations } from '../api/schema';

export type FlightTrends =
  operations['getFlightTrends']['responses'][200]['content']['application/json'];
export type TrendMonth = NonNullable<FlightTrends['trends']>[number];

/**
 * Lightweight monthly activity series (hours + flights per month).
 * Keyed under ['trends'], part of FLIGHT_DEPENDENT_QUERY_KEYS.
 */
export const useTrends = (months = 12) => {
  return useQuery({
    queryKey: ['trends', months],
    queryFn: async (): Promise<FlightTrends> => {
      const { data, error } = await apiClient.GET('/reports/trends', {
        params: { query: { months } },
      });
      if (error) throw error;
      return data as FlightTrends;
    },
  });
};

/** Fills the last `months` calendar months with zero rows. */
export function fillTrendMonths(trends: TrendMonth[] | undefined, months: number): TrendMonth[] {
  const byMonth = new Map((trends ?? []).map((t) => [t.month, t]));
  const out: TrendMonth[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push(byMonth.get(key) ?? { month: key, totalMinutes: 0, flights: 0 });
  }
  return out;
}
