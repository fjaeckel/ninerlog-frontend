import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Announcement = components['schemas']['Announcement'];

export type { Announcement };

export const useAnnouncements = () => {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async (): Promise<{ announcements: Announcement[]; hints: Announcement[] }> => {
      const { data, error } = await apiClient.GET('/announcements');
      if (error) throw error;
      return data as { announcements: Announcement[]; hints: Announcement[] };
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: { message: string; severity: string; expiresAt?: string }) => {
      const { data, error } = await apiClient.POST('/admin/announcements', {
        body: req as any,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/announcements/{announcementId}', {
        params: { path: { announcementId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
};
