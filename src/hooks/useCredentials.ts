import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Credential = components['schemas']['Credential'];
type CredentialCreate = components['schemas']['CredentialCreate'];
type CredentialUpdate = components['schemas']['CredentialUpdate'];

export const useCredentials = () => {
  return useQuery({
    queryKey: ['credentials'],
    queryFn: async (): Promise<Credential[]> => {
      const { data, error } = await apiClient.GET('/credentials');
      if (error) throw error;
      return data as Credential[];
    },
  });
};

export const useCredential = (credentialId: string) => {
  return useQuery({
    queryKey: ['credentials', credentialId],
    queryFn: async (): Promise<Credential> => {
      const { data, error } = await apiClient.GET('/credentials/{credentialId}', {
        params: { path: { credentialId } },
      });
      if (error) throw error;
      return data as Credential;
    },
    enabled: !!credentialId,
  });
};

export const useCreateCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CredentialCreate): Promise<Credential> => {
      const { data: result, error } = await apiClient.POST('/credentials', {
        body: data as any,
      });
      if (error) throw error;
      return result as Credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
};

export const useUpdateCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CredentialUpdate }): Promise<Credential> => {
      const { data: result, error } = await apiClient.PATCH('/credentials/{credentialId}', {
        params: { path: { credentialId: id } },
        body: data as any,
      });
      if (error) throw error;
      return result as Credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
};

export const useDeleteCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/credentials/{credentialId}', {
        params: { path: { credentialId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
};
