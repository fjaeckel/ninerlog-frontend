import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Aircraft = components['schemas']['Aircraft'];
type AircraftCreate = components['schemas']['AircraftCreate'];
type AircraftUpdate = components['schemas']['AircraftUpdate'];
type PaginatedAircraft = components['schemas']['PaginatedAircraft'];

export type { Aircraft, AircraftCreate, AircraftUpdate };

export const useAircraft = () => {
  return useQuery({
    queryKey: ['aircraft'],
    queryFn: async (): Promise<Aircraft[]> => {
      const { data, error } = await apiClient.GET('/aircraft', {
        params: { query: { pageSize: 100 } },
      });
      if (error) throw error;
      return (data as PaginatedAircraft)?.data ?? [];
    },
  });
};

export const useAircraftById = (aircraftId: string) => {
  return useQuery({
    queryKey: ['aircraft', aircraftId],
    queryFn: async (): Promise<Aircraft> => {
      const { data, error } = await apiClient.GET('/aircraft/{aircraftId}', {
        params: { path: { aircraftId } },
      });
      if (error) throw error;
      return data as Aircraft;
    },
    enabled: !!aircraftId,
  });
};

export const useCreateAircraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AircraftCreate): Promise<Aircraft> => {
      const { data: result, error } = await apiClient.POST('/aircraft', {
        body: data as any,
      });
      if (error) throw error;
      return result as Aircraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });
};

export const useUpdateAircraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AircraftUpdate }): Promise<Aircraft> => {
      const { data: result, error } = await apiClient.PATCH('/aircraft/{aircraftId}', {
        params: { path: { aircraftId: id } },
        body: data as any,
      });
      if (error) throw error;
      return result as Aircraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });
};

export const useDeleteAircraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/aircraft/{aircraftId}', {
        params: { path: { aircraftId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });
};
