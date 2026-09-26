import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { LicencePrivilege, LicencePrivilegeCreate, LicencePrivilegeUpdate } from '../lib/privileges';

const privilegesKey = (licenseId: string) => ['licencePrivileges', licenseId] as const;

const invalidate = (queryClient: QueryClient, licenseId: string) => {
  queryClient.invalidateQueries({ queryKey: privilegesKey(licenseId) });
  queryClient.invalidateQueries({ queryKey: ['currency'] });
};

export const useLicencePrivileges = (licenseId: string) =>
  useQuery<LicencePrivilege[]>({
    queryKey: privilegesKey(licenseId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/licenses/{licenseId}/privileges', {
        params: { path: { licenseId } },
      });
      if (error) throw error;
      return (data ?? []) as LicencePrivilege[];
    },
    enabled: !!licenseId,
  });

export const useCreateLicencePrivilege = () => {
  const queryClient = useQueryClient();
  return useMutation<LicencePrivilege, Error, { licenseId: string; data: LicencePrivilegeCreate }>({
    mutationFn: async ({ licenseId, data: body }) => {
      const { data, error } = await apiClient.POST('/licenses/{licenseId}/privileges', {
        params: { path: { licenseId } },
        body,
      });
      if (error) throw error;
      return data as LicencePrivilege;
    },
    onSuccess: (_, { licenseId }) => invalidate(queryClient, licenseId),
  });
};

export const useUpdateLicencePrivilege = () => {
  const queryClient = useQueryClient();
  return useMutation<LicencePrivilege, Error, { licenseId: string; privilegeId: string; data: LicencePrivilegeUpdate }>({
    mutationFn: async ({ licenseId, privilegeId, data: body }) => {
      const { data, error } = await apiClient.PATCH('/licenses/{licenseId}/privileges/{privilegeId}', {
        params: { path: { licenseId, privilegeId } },
        body,
      });
      if (error) throw error;
      return data as LicencePrivilege;
    },
    onSuccess: (_, { licenseId }) => invalidate(queryClient, licenseId),
  });
};

export const useDeleteLicencePrivilege = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { licenseId: string; privilegeId: string }>({
    mutationFn: async ({ licenseId, privilegeId }) => {
      const { error } = await apiClient.DELETE('/licenses/{licenseId}/privileges/{privilegeId}', {
        params: { path: { licenseId, privilegeId } },
      });
      if (error) throw error;
    },
    onSuccess: (_, { licenseId }) => invalidate(queryClient, licenseId),
  });
};
