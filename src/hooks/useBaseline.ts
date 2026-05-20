import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type FlightBaseline = components['schemas']['FlightBaseline'];
export type FlightBaselineInput = components['schemas']['FlightBaselineInput'];

const BASELINE_QUERY_KEY = ['my-baseline'] as const;

// Fetch the current user's initial-hours snapshot. Resolves to `null` when no
// snapshot is configured (the backend returns 404).
export const useMyBaseline = () => {
  return useQuery({
    queryKey: BASELINE_QUERY_KEY,
    queryFn: async (): Promise<FlightBaseline | null> => {
      const { data, error, response } = await apiClient.GET('/users/me/baseline');
      if (response.status === 404) return null;
      if (error) throw error;
      return (data as FlightBaseline) ?? null;
    },
    // Snapshots change rarely; cache for the session.
    staleTime: 5 * 60 * 1000,
  });
};

// Create or replace the baseline.
export const useUpsertBaseline = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FlightBaselineInput): Promise<FlightBaseline> => {
      const { data, error } = await apiClient.PUT('/users/me/baseline', {
        body: input,
      });
      if (error) throw error;
      return data as FlightBaseline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASELINE_QUERY_KEY });
      // Statistics now include / exclude the baseline contribution.
      queryClient.invalidateQueries({ queryKey: ['my-statistics'] });
    },
  });
};

// Remove the baseline.
export const useDeleteBaseline = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await apiClient.DELETE('/users/me/baseline');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASELINE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['my-statistics'] });
    },
  });
};
