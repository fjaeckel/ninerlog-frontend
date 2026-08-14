import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Contact, ContactCreate } from '../types/api';

/**
 * Response header on PUT /contacts/{id} reporting how many flight crew entries
 * the rename rewrote. The API exposes it via CORS; it is absent — not zero —
 * when talking to a server that predates the propagating rename.
 */
const CREW_ENTRIES_RENAMED_HEADER = 'X-Crew-Entries-Renamed';

/** A contact rename, plus how much of the logbook it rewrote. */
export interface ContactUpdateResult {
  contact: Contact;
  /** Crew entries renamed, or null when the server reported no count. */
  crewEntriesRenamed: number | null;
}

function readRenamedCount(response: Response): number | null {
  const raw = response.headers.get(CREW_ENTRIES_RENAMED_HEADER);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

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

/**
 * Renaming a contact rewrites the name stored on the crew entries of the
 * user's unsigned flights, so any cached flight is stale afterwards — hence
 * the flights invalidation alongside contacts. Flights carrying a completed
 * instructor signature keep the name they were signed with and are left alone
 * by the server.
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  return useMutation<ContactUpdateResult, Error, { id: string; data: ContactCreate }>({
    mutationFn: async ({ id, data: body }) => {
      const { data, error, response } = await apiClient.PUT('/contacts/{contactId}', {
        params: { path: { contactId: id } },
        body,
      });
      if (error) throw error;
      return { contact: data as Contact, crewEntriesRenamed: readRenamedCount(response) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      // Only refetch the logbook when the rename actually reached it. A null
      // count means an older server, where propagation cannot be ruled out.
      if (result.crewEntriesRenamed === null || result.crewEntriesRenamed > 0) {
        queryClient.invalidateQueries({ queryKey: ['flights'] });
      }
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
      // The flights keep their crew names but lose the link, so any cached
      // flight still carries a contactId that no longer resolves.
      queryClient.invalidateQueries({ queryKey: ['flights'] });
    },
  });
};
