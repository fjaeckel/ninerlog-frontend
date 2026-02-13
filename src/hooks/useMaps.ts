import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type FlightRoutesResponse = components['schemas']['FlightRoutesResponse'];
type AirportStats = components['schemas']['AirportStats'];
type Airport = components['schemas']['Airport'];

export type { FlightRoutesResponse, AirportStats, Airport };

export const useFlightRoutes = () => {
  return useQuery({
    queryKey: ['flightRoutes'],
    queryFn: async (): Promise<FlightRoutesResponse> => {
      const { data, error } = await apiClient.GET('/reports/routes');
      if (error) throw error;
      return data as FlightRoutesResponse;
    },
  });
};

export const useAirportStats = () => {
  return useQuery({
    queryKey: ['airportStats'],
    queryFn: async (): Promise<AirportStats[]> => {
      const { data, error } = await apiClient.GET('/reports/airport-stats');
      if (error) throw error;
      return data as AirportStats[];
    },
  });
};

export const useAirportSearch = (query: string) => {
  return useQuery({
    queryKey: ['airports', 'search', query],
    queryFn: async (): Promise<Airport[]> => {
      const { data, error } = await apiClient.GET('/airports/search', {
        params: { query: { q: query, limit: 10 } },
      });
      if (error) throw error;
      return data as Airport[];
    },
    enabled: query.length >= 2,
  });
};
