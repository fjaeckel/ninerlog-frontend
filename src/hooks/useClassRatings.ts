import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ClassRating, ClassRatingCreate, ClassRatingUpdate } from '../types/api';

export const useClassRatings = (licenseId: string) => {
  return useQuery<ClassRating[]>({
    queryKey: ['classRatings', licenseId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/licenses/{licenseId}/ratings', {
        params: { path: { licenseId } },
      });
      if (error) throw error;
      return data as ClassRating[];
    },
    enabled: !!licenseId,
  });
};

export const useCreateClassRating = () => {
  const queryClient = useQueryClient();
  return useMutation<ClassRating, Error, { licenseId: string; data: ClassRatingCreate }>({
    mutationFn: async ({ licenseId, data: body }) => {
      const { data, error } = await apiClient.POST('/licenses/{licenseId}/ratings', {
        params: { path: { licenseId } },
        body,
      });
      if (error) throw error;
      return data as ClassRating;
    },
    onSuccess: (_, { licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['classRatings', licenseId] });
    },
  });
};

export const useUpdateClassRating = () => {
  const queryClient = useQueryClient();
  return useMutation<ClassRating, Error, { licenseId: string; ratingId: string; data: ClassRatingUpdate }>({
    mutationFn: async ({ licenseId, ratingId, data: body }) => {
      const { data, error } = await apiClient.PATCH('/licenses/{licenseId}/ratings/{ratingId}', {
        params: { path: { licenseId, ratingId } },
        body,
      });
      if (error) throw error;
      return data as ClassRating;
    },
    onSuccess: (_, { licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['classRatings', licenseId] });
    },
  });
};

export const useDeleteClassRating = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { licenseId: string; ratingId: string }>({
    mutationFn: async ({ licenseId, ratingId }) => {
      const { error } = await apiClient.DELETE('/licenses/{licenseId}/ratings/{ratingId}', {
        params: { path: { licenseId, ratingId } },
      });
      if (error) throw error;
    },
    onSuccess: (_, { licenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['classRatings', licenseId] });
    },
  });
};
