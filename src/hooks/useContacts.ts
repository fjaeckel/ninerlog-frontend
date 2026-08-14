import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Contact, ContactCreate } from '../types/api';

export const useContacts = () => {
  return useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/contacts');
      if (error) throw error;
      return data as Contact[];
    },
  });
};

export const useSearchContacts = (query: string) => {
  return useQuery<Contact[]>({
    queryKey: ['contacts', 'search', query],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/contacts/search', {
        params: { query: { q: query } },
      });
      if (error) throw error;
      return data as Contact[];
    },
    enabled: query.length >= 2,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation<Contact, Error, ContactCreate>({
    mutationFn: async (body) => {
      const { data, error } = await apiClient.POST('/contacts', { body });
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  return useMutation<Contact, Error, { id: string; data: ContactCreate }>({
    mutationFn: async ({ id, data: body }) => {
      const { data, error } = await apiClient.PUT('/contacts/{contactId}', {
        params: { path: { contactId: id } },
        body,
      });
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await apiClient.DELETE('/contacts/{contactId}', {
        params: { path: { contactId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};
