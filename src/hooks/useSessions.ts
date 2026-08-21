import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type Session = components['schemas']['Session'];

export interface SessionList {
  sessions: Session[];
  maxSessions: number;
}

export const SESSIONS_QUERY_KEY = ['sessions'] as const;

export const useSessions = () =>
  useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async (): Promise<SessionList> => {
      const { data, error } = await apiClient.GET('/auth/sessions');
      if (error) throw error;
      return {
        sessions: data?.sessions ?? [],
        maxSessions: data?.maxSessions ?? 0,
      };
    },
  });

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await apiClient.DELETE('/auth/sessions/{sessionId}', {
        params: { path: { sessionId } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
};

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, error } = await apiClient.DELETE('/auth/sessions');
      if (error) throw error;
      return data?.revoked ?? 0;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
};
