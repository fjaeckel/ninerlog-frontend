import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';
import { TRAINING_PROGRESS_QUERY_KEY } from './invalidation';

export type TrainingProgress = components['schemas']['TrainingProgress'];
export type TrainingProgramme = components['schemas']['TrainingProgramme'];
export type TrainingProgrammeId = components['schemas']['TrainingProgrammeId'];
export type TrainingItem = components['schemas']['TrainingItem'];
export type TrainingUnit = TrainingItem['unit'];

/** Query key of `GET /training/progress` for the explicitly requested programmes. */
export const trainingProgressQueryKey = (programmes: readonly TrainingProgrammeId[] = []) =>
  [...TRAINING_PROGRESS_QUERY_KEY, [...programmes].sort()] as const;

/** Training progress for the disciplines in training, plus `programmes`. */
export const useTrainingProgress = (programmes: readonly TrainingProgrammeId[] = []) => {
  return useQuery({
    queryKey: trainingProgressQueryKey(programmes),
    queryFn: async (): Promise<TrainingProgress> => {
      const { data, error } = await apiClient.GET('/training/progress', {
        params: { query: programmes.length > 0 ? { programme: [...programmes] } : {} },
      });
      if (error) throw error;
      return (data as TrainingProgress | undefined) ?? { programmes: [] };
    },
  });
};
