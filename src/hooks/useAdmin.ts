import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { APP_VERSION, APP_COMMIT } from '../version';
import type { components } from '../api/schema';

type AdminUser = components['schemas']['AdminUser'];
type PaginatedAdminUsers = components['schemas']['PaginatedAdminUsers'];
type AdminStats = components['schemas']['AdminStats'];
type AdminConfig = components['schemas']['AdminConfig'];
type PaginatedAdminAuditLog = components['schemas']['PaginatedAdminAuditLog'];
type EmailDeliveryEvent = components['schemas']['EmailDeliveryEvent'];
type EmailSuppression = components['schemas']['EmailSuppression'];
type UpdateStatus = components['schemas']['UpdateStatus'];
type UpdateComponent = components['schemas']['UpdateComponent'];

export type {
  AdminUser,
  PaginatedAdminUsers,
  AdminStats,
  AdminConfig,
  PaginatedAdminAuditLog,
  EmailDeliveryEvent,
  EmailSuppression,
  UpdateStatus,
  UpdateComponent,
};

export const useAdminUsers = (page = 1, pageSize = 20, search?: string) => {
  return useQuery({
    queryKey: ['admin', 'users', page, pageSize, search],
    queryFn: async (): Promise<PaginatedAdminUsers> => {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: { query: { page, pageSize, search } },
      });
      if (error) throw error;
      return data as PaginatedAdminUsers;
    },
  });
};

export const useDisableUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await apiClient.POST('/admin/users/{userId}/disable', {
        params: { path: { userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useEnableUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await apiClient.POST('/admin/users/{userId}/enable', {
        params: { path: { userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useUnlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await apiClient.POST('/admin/users/{userId}/unlock', {
        params: { path: { userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useResetUser2fa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await apiClient.POST('/admin/users/{userId}/reset-2fa', {
        params: { path: { userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await apiClient.DELETE('/admin/users/{userId}', {
        params: { path: { userId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await apiClient.GET('/admin/stats');
      if (error) throw error;
      return data as AdminStats;
    },
  });
};

export const useAdminAuditLog = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['admin', 'audit-log', page, pageSize],
    queryFn: async (): Promise<PaginatedAdminAuditLog> => {
      const { data, error } = await apiClient.GET('/admin/audit-log', {
        params: { query: { page, pageSize } },
      });
      if (error) throw error;
      return data as PaginatedAdminAuditLog;
    },
  });
};

export const useCleanupTokens = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/admin/maintenance/cleanup-tokens');
      if (error) throw error;
      return data as { refreshTokensDeleted: number; resetTokensDeleted: number; message: string };
    },
  });
};

export const useSmtpTest = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/admin/maintenance/smtp-test');
      if (error) throw error;
      return data as { message: string };
    },
  });
};

export const useTriggerNotifications = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/admin/maintenance/trigger-notifications');
      if (error) throw error;
      return data as { message: string };
    },
  });
};

export const useAdminConfig = () => {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: async (): Promise<AdminConfig> => {
      const { data, error } = await apiClient.GET('/admin/config');
      if (error) throw error;
      return data as AdminConfig;
    },
  });
};

export const useEmailDeliveries = (recipient?: string, limit = 100) => {
  return useQuery({
    queryKey: ['admin', 'email', 'deliveries', recipient, limit],
    queryFn: async (): Promise<EmailDeliveryEvent[]> => {
      const { data, error } = await apiClient.GET('/admin/email/deliveries', {
        params: { query: { recipient: recipient || undefined, limit } },
      });
      if (error) throw error;
      return (data as { data: EmailDeliveryEvent[] }).data;
    },
  });
};

export const useEmailSuppressions = (limit = 100) => {
  return useQuery({
    queryKey: ['admin', 'email', 'suppressions', limit],
    queryFn: async (): Promise<EmailSuppression[]> => {
      const { data, error } = await apiClient.GET('/admin/email/suppressions', {
        params: { query: { limit } },
      });
      if (error) throw error;
      return (data as { data: EmailSuppression[] }).data;
    },
  });
};

export const useLiftEmailSuppression = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await apiClient.DELETE('/admin/email/suppressions/{email}', {
        params: { path: { email } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
    },
  });
};

export const useCleanupUnverifiedAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/admin/maintenance/cleanup-unverified');
      if (error) throw error;
      return data as { remindersSent: number; accountsDeleted: number; message?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'email'] });
    },
  });
};

export const useUpdateStatus = () => {
  return useQuery({
    queryKey: ['admin', 'update', APP_VERSION, APP_COMMIT],
    queryFn: async (): Promise<UpdateStatus> => {
      const { data, error } = await apiClient.GET('/admin/update', {
        params: {
          query: {
            frontendVersion: APP_VERSION,
            frontendCommit: APP_COMMIT || undefined,
          },
        },
      });
      if (error) throw error;
      return data as UpdateStatus;
    },
    staleTime: 60 * 60 * 1000,
    // Poll while a reported commit is still being compared.
    refetchInterval: (query) => {
      const status = query.state.data;
      if (!status?.checkEnabled) return false;
      const pending = (status.components ?? []).some((c) => c.state === 'unknown' && c.currentCommit);
      return pending ? 5000 : false;
    },
  });
};
