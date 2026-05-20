import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type BackupProvider = components['schemas']['BackupProvider'];
type BackupDestination = components['schemas']['BackupDestination'];
type BackupDestinationCreate = components['schemas']['BackupDestinationCreate'];
type BackupDestinationUpdate = components['schemas']['BackupDestinationUpdate'];
type BackupTestResult = components['schemas']['BackupTestResult'];
type BackupRun = components['schemas']['BackupRun'];
type PaginatedBackupRuns = components['schemas']['PaginatedBackupRuns'];

export const useBackupProviders = (enabled = true) => {
  return useQuery({
    queryKey: ['backup-providers'],
    enabled,
    queryFn: async (): Promise<BackupProvider[]> => {
      const { data, error } = await apiClient.GET('/backups/providers');
      if (error) throw error;
      return data as BackupProvider[];
    },
    staleTime: 1000 * 60 * 60,
  });
};

export const useBackupDestinations = () => {
  return useQuery({
    queryKey: ['backup-destinations'],
    queryFn: async (): Promise<BackupDestination[]> => {
      const { data, error } = await apiClient.GET('/backups/destinations');
      if (error) throw error;
      return data as BackupDestination[];
    },
  });
};

export const useBackupDestination = (destinationId: string | null) => {
  return useQuery({
    queryKey: ['backup-destinations', destinationId],
    enabled: !!destinationId,
    queryFn: async (): Promise<BackupDestination> => {
      const { data, error } = await apiClient.GET('/backups/destinations/{destinationId}', {
        params: { path: { destinationId: destinationId! } },
      });
      if (error) throw error;
      return data as BackupDestination;
    },
  });
};

export const useCreateBackupDestination = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BackupDestinationCreate): Promise<BackupDestination> => {
      const { data: result, error } = await apiClient.POST('/backups/destinations', {
        body: data,
      });
      if (error) throw error;
      return result as BackupDestination;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-destinations'] });
    },
  });
};

export const useUpdateBackupDestination = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BackupDestinationUpdate }): Promise<BackupDestination> => {
      const { data: result, error } = await apiClient.PATCH('/backups/destinations/{destinationId}', {
        params: { path: { destinationId: id } },
        body: data,
      });
      if (error) throw error;
      return result as BackupDestination;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['backup-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['backup-destinations', variables.id] });
    },
  });
};

export const useDeleteBackupDestination = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/backups/destinations/{destinationId}', {
        params: { path: { destinationId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-destinations'] });
    },
  });
};

export const useTestBackupDestination = () => {
  return useMutation({
    mutationFn: async (id: string): Promise<BackupTestResult> => {
      const { data, error } = await apiClient.POST('/backups/destinations/{destinationId}/test', {
        params: { path: { destinationId: id } },
      });
      if (error) throw error;
      return data as BackupTestResult;
    },
  });
};

export const useRunBackupNow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<BackupRun> => {
      const { data, error } = await apiClient.POST('/backups/destinations/{destinationId}/run', {
        params: { path: { destinationId: id } },
      });
      if (error) throw error;
      return data as BackupRun;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['backup-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['backup-runs', id] });
    },
  });
};

export const useBackupRuns = (
  destinationId: string | null,
  options: { page?: number; pageSize?: number } = {},
) => {
  const { page = 1, pageSize = 20 } = options;
  return useQuery({
    queryKey: ['backup-runs', destinationId, page, pageSize],
    enabled: !!destinationId,
    queryFn: async (): Promise<PaginatedBackupRuns> => {
      const { data, error } = await apiClient.GET('/backups/destinations/{destinationId}/runs', {
        params: {
          path: { destinationId: destinationId! },
          query: { page, pageSize },
        },
      });
      if (error) throw error;
      return data as PaginatedBackupRuns;
    },
  });
};
