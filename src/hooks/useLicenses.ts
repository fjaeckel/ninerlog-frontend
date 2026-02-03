import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLicenseStore, License } from '../stores/licenseStore';
import apiClient from '../lib/api';

interface CreateLicenseData {
  licenseType: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate?: string;
  issuingAuthority: string;
  isActive?: boolean;
}

export const useLicenses = () => {
  const { setLicenses } = useLicenseStore();

  return useQuery({
    queryKey: ['licenses'],
    queryFn: async (): Promise<License[]> => {
      const response = await apiClient.get('/licenses');
      const licenses = response.data;
      setLicenses(licenses);
      return licenses;
    },
  });
};

export const useCreateLicense = () => {
  const queryClient = useQueryClient();
  const { addLicense } = useLicenseStore();

  return useMutation({
    mutationFn: async (data: CreateLicenseData): Promise<License> => {
      const response = await apiClient.post('/licenses', data);
      return response.data;
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<License> }): Promise<License> => {
      const response = await apiClient.put(`/licenses/${id}`, data);
      return response.data;
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
      await apiClient.delete(`/licenses/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      removeLicense(id);
    },
  });
};
