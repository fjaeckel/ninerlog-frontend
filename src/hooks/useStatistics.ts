import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components, operations } from '../api/schema';

type Statistics = components['schemas']['Statistics'];
type Currency = components['schemas']['Currency'];
type StatisticsParams = operations['getLicenseStatistics']['parameters']['query'];
type MyStatisticsParams = operations['getMyStatistics']['parameters']['query'];

// Get statistics for the current user (no license required)
export const useMyStatistics = (params?: MyStatisticsParams) => {
  return useQuery({
    queryKey: ['my-statistics', params],
    queryFn: async (): Promise<Statistics> => {
      const { data, error } = await apiClient.GET('/users/me/statistics', {
        params: { query: params || {} },
      });
      if (error) throw error;
      return data as Statistics;
    },
  });
};

// Get statistics for a specific license
export const useLicenseStatistics = (licenseId: string, params?: StatisticsParams) => {
  return useQuery({
    queryKey: ['statistics', licenseId, params],
    queryFn: async (): Promise<Statistics> => {
      const { data, error } = await apiClient.GET('/licenses/{licenseId}/statistics', {
        params: {
          path: { licenseId },
          query: params || {},
        },
      });
      if (error) throw error;
      return data as Statistics;
    },
    enabled: !!licenseId,
  });
};

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
