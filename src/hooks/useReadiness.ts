import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type ReadinessReport = components['schemas']['ReadinessReport'];
export type ReadinessItem = components['schemas']['ReadinessItem'];

export interface ReadinessQuery {
  /** YYYY-MM-DD, today to 366 days ahead. */
  date: string;
  /** Restricts the answer to the ratings covering this aircraft. */
  aircraftReg?: string | null;
  passengers?: boolean;
}

/** Non-2xx answer from `GET /currency/readiness`; `status` 400 is a bad date, 404 an unknown aircraft. */
export class ReadinessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ReadinessError';
  }
}

/** Query key; under `['currency']` so flight mutations invalidate it. */
export const readinessQueryKey = (q: ReadinessQuery) =>
  ['currency', 'readiness', q.date, q.aircraftReg ?? null, !!q.passengers] as const;

/** "May I fly on this date?" per rating, launch method, passengers and medical. */
export const useReadiness = (q: ReadinessQuery, options: { enabled?: boolean } = {}) => {
  return useQuery<ReadinessReport, ReadinessError>({
    queryKey: readinessQueryKey(q),
    queryFn: async (): Promise<ReadinessReport> => {
      const { data, error, response } = await apiClient.GET('/currency/readiness', {
        params: {
          query: {
            date: q.date,
            ...(q.aircraftReg ? { aircraftReg: q.aircraftReg } : {}),
            ...(q.passengers ? { passengers: true } : {}),
          },
        },
      });
      if (error || !response.ok) {
        const message = (error as { error?: string } | undefined)?.error ?? 'Readiness request failed';
        throw new ReadinessError(response.status, message);
      }
      return (data as ReadinessReport | undefined) ?? { date: q.date, items: [] };
    },
    enabled: options.enabled ?? true,
    retry: (count, err) => !(err instanceof ReadinessError && (err.status === 400 || err.status === 404)) && count < 2,
  });
};
