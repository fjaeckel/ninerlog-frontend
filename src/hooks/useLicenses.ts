import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLicenseStore } from '../stores/licenseStore';
import { apiClient } from '../api/client';
import type { components, operations } from '../api/schema';

type License = components['schemas']['License'];
type LicenseCreate = components['schemas']['LicenseCreate'];
// LicenseUpdate is inline in the operation
type LicenseUpdate = operations['updateLicense']['requestBody']['content']['application/json'];

export const useLicenses = () => {
  const { setLicenses } = useLicenseStore();

  return useQuery({
    queryKey: ['licenses'],
    queryFn: async (): Promise<License[]> => {
      const { data, error } = await apiClient.GET('/licenses');
      if (error) throw error;
      const licenses = data as License[];
      setLicenses(licenses);
      return licenses;
    },
  });
};

export const useCreateLicense = () => {
  const queryClient = useQueryClient();
  const { addLicense } = useLicenseStore();

  return useMutation({
    mutationFn: async (requestData: LicenseCreate): Promise<License> => {
      const { data, error } = await apiClient.POST('/licenses', {
        body: requestData as any,
      });
      if (error) throw error;
      return data as License;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      addLicense(data);
    },
  });
};

export const useUpdateLicense = () => {
  const queryClient = useQueryClient();
  const { updateLicense: updateLicenseInStore } = useLicenseStore();

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: LicenseUpdate }): Promise<License> => {
      const { data, error } = await apiClient.PATCH('/licenses/{licenseId}', {
        params: { path: { licenseId: id } },
        body: updateData as any,
      });
      if (error) throw error;
      return data as License;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      updateLicenseInStore(data.id, data);
    },
  });
};

export const useDeleteLicense = () => {
  const queryClient = useQueryClient();
  const { removeLicense } = useLicenseStore();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/licenses/{licenseId}', {
        params: { path: { licenseId: id } },
      });
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      removeLicense(id);
    },
  });
};
