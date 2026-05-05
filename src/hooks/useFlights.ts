import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components, operations } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

type Flight = components['schemas']['Flight'];
type FlightCreate = components['schemas']['FlightCreate'];
type FlightUpdate = components['schemas']['FlightUpdate'];
type PaginatedFlights = components['schemas']['PaginatedFlights'];
type ListFlightsParams = operations['listFlights']['parameters']['query'];

// Get paginated list of flights
export const useFlights = (params?: ListFlightsParams) => {
  return useQuery({
    queryKey: ['flights', params],
    queryFn: async (): Promise<PaginatedFlights> => {
      const { data, error } = await apiClient.GET('/flights', {
        params: { query: params || {} },
      });
      if (error) throw error;
      return data as PaginatedFlights;
    },
  });
};

// Get a single flight by ID
export const useFlight = (flightId: string) => {
  return useQuery({
    queryKey: ['flights', flightId],
    queryFn: async (): Promise<Flight> => {
      const { data, error } = await apiClient.GET('/flights/{flightId}', {
        params: { path: { flightId } },
      });
      if (error) throw error;
      return data as Flight;
    },
    enabled: !!flightId,
  });
};

// Create a new flight
export const useCreateFlight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flightData: FlightCreate): Promise<Flight> => {
      const { data, error } = await apiClient.POST('/flights', {
        body: flightData as any,
      });
      if (error) throw error;
      return data as Flight;
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
    },
  });
};

// Update an existing flight
export const useUpdateFlight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: FlightUpdate }): Promise<Flight> => {
      const { data, error } = await apiClient.PUT('/flights/{flightId}', {
        params: { path: { flightId: id } },
        body: updateData as any,
      });
      if (error) throw error;
      return data as Flight;
    },
    onSuccess: (data) => {
      invalidateFlightDependentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['flights', data.id] });
    },
  });
};

// Delete a flight
export const useDeleteFlight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/flights/{flightId}', {
        params: { path: { flightId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
    },
  });
};
