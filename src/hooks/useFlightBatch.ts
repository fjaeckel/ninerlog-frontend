import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

export type FlightBatchCreate = components['schemas']['FlightBatchCreate'];
export type FlightBatchLeg = components['schemas']['FlightBatchLeg'];
export type FlightBatchResult = components['schemas']['FlightBatchResult'];

/** `POST /flights/batch`; all legs are created or none. */
export const useCreateFlightBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: FlightBatchCreate): Promise<FlightBatchResult> => {
      const { data, error } = await apiClient.POST('/flights/batch', { body });
      if (error) throw error;
      return data as FlightBatchResult;
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
    },
  });
};
