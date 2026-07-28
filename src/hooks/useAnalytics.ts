import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type FlightAnalytics = components['schemas']['FlightAnalytics'];
export type AnalyticsTotals = components['schemas']['AnalyticsTotals'];
export type AnalyticsMonthPoint = components['schemas']['AnalyticsMonthPoint'];
export type AnalyticsYearPoint = components['schemas']['AnalyticsYearPoint'];
export type AnalyticsAircraftRow = components['schemas']['AnalyticsAircraftRow'];
export type AnalyticsGroupRow = components['schemas']['AnalyticsGroupRow'];
export type AnalyticsAirportRow = components['schemas']['AnalyticsAirportRow'];
export type AnalyticsCountryRow = components['schemas']['AnalyticsCountryRow'];
export type AnalyticsRouteRow = components['schemas']['AnalyticsRouteRow'];
export type AnalyticsPersonRow = components['schemas']['AnalyticsPersonRow'];
export type AnalyticsBucketRow = components['schemas']['AnalyticsBucketRow'];
export type AnalyticsRecords = components['schemas']['AnalyticsRecords'];
export type AnalyticsFlightRef = components['schemas']['AnalyticsFlightRef'];

/** Timeframes offered by the Reports page. 0 means the whole logbook. */
export const ANALYTICS_RANGES = [6, 12, 24, 60, 0] as const;
export type AnalyticsRangeMonths = (typeof ANALYTICS_RANGES)[number];

/**
 * Loads the whole Reports page in one request.
 *
 * `keepPreviousData` holds the last payload while a new timeframe loads, so
 * switching ranges dims the page rather than collapsing it into skeletons.
 */
export const useAnalytics = (months: number = 12, limit = 25) => {
  return useQuery({
    queryKey: ['analytics', months, limit],
    queryFn: async (): Promise<FlightAnalytics> => {
      const { data, error } = await apiClient.GET('/reports/analytics', {
        params: { query: { months, limit } },
      });
      if (error) throw error;
      return data as FlightAnalytics;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
};
