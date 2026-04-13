import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type NotificationPreferences = components['schemas']['NotificationPreferences'];
type NotificationPreferencesUpdate = components['schemas']['NotificationPreferencesUpdate'];
type NotificationHistoryResponse = components['schemas']['NotificationHistoryResponse'];

export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await apiClient.GET('/users/me/notifications');
      if (error) throw error;
      return data as NotificationPreferences;
    },
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: NotificationPreferencesUpdate): Promise<NotificationPreferences> => {
      const { data: result, error } = await apiClient.PATCH('/users/me/notifications', {
        body: data as any,
      });
      if (error) throw error;
      return result as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });
};

export const useNotificationHistory = (limit = 20, offset = 0) => {
  return useQuery({
    queryKey: ['notificationHistory', limit, offset],
    queryFn: async (): Promise<NotificationHistoryResponse> => {
      const { data, error } = await apiClient.GET('/users/me/notifications/history', {
        params: { query: { limit, offset } },
      });
      if (error) throw error;
      return data as NotificationHistoryResponse;
    },
  });
};
