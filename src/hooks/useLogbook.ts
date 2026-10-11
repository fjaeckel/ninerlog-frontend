import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type LogbookMode = components['schemas']['LogbookMode'];
export type LogbookModeEvent = components['schemas']['LogbookModeEvent'];
export type LogbookModeLicence = components['schemas']['LogbookModeLicence'];
export type FlightRevision = components['schemas']['FlightRevision'];
export type FlightRevisionChange = components['schemas']['FlightRevisionChange'];
export type VoidedFlight = components['schemas']['VoidedFlight'];
export type LogbookCertification = components['schemas']['LogbookCertification'];

export const LOGBOOK_MODE_KEY = ['logbookMode'] as const;
export const LOGBOOK_CERTIFICATIONS_KEY = ['logbookCertifications'] as const;
export const VOIDED_FLIGHTS_KEY = ['voidedFlights'] as const;
export const flightRevisionsKey = (flightId: string) => ['flightRevisions', flightId] as const;

/** Strict logbook mode, its triggering licences and its switch history. */
export const useLogbookMode = () =>
  useQuery({
    queryKey: LOGBOOK_MODE_KEY,
    queryFn: async (): Promise<LogbookMode | null> => {
      const { data, error } = await apiClient.GET('/logbook/mode');
      if (error) throw error;
      return (data as LogbookMode | undefined) ?? null;
    },
  });

/** True when the loaded logbook mode is strict; false while loading or on error. */
export const useIsStrictLogbook = (): boolean => useLogbookMode().data?.strict === true;

export const useUpdateLogbookMode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (strict: boolean): Promise<LogbookMode> => {
      const { data, error } = await apiClient.PUT('/logbook/mode', { body: { strict } });
      if (error) throw error;
      return data as LogbookMode;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(LOGBOOK_MODE_KEY, data);
      queryClient.invalidateQueries({ queryKey: LOGBOOK_MODE_KEY });
    },
  });
};

/** A flight's recorded revisions, newest first. */
export const useFlightRevisions = (flightId: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: flightRevisionsKey(flightId),
    queryFn: async (): Promise<FlightRevision[]> => {
      const { data, error } = await apiClient.GET('/flights/{flightId}/revisions', {
        params: { path: { flightId } },
      });
      if (error) throw error;
      return (data as FlightRevision[] | undefined) ?? [];
    },
    enabled: !!flightId && (options?.enabled ?? true),
  });

/** Deleted flights kept as void records, newest first. */
export const useVoidedFlights = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: VOIDED_FLIGHTS_KEY,
    queryFn: async (): Promise<VoidedFlight[]> => {
      const { data, error } = await apiClient.GET('/flights/voided');
      if (error) throw error;
      return (data as VoidedFlight[] | undefined) ?? [];
    },
    enabled: options?.enabled ?? true,
  });

/** Past "certified through" statements, newest first. */
export const useLogbookCertifications = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: LOGBOOK_CERTIFICATIONS_KEY,
    queryFn: async (): Promise<LogbookCertification[]> => {
      const { data, error } = await apiClient.GET('/logbook/certifications');
      if (error) throw error;
      return (data as LogbookCertification[] | undefined) ?? [];
    },
    enabled: options?.enabled ?? true,
  });

export const useCreateLogbookCertification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (certifiedThrough: string): Promise<LogbookCertification> => {
      const { data, error } = await apiClient.POST('/logbook/certifications', {
        body: { certifiedThrough },
      });
      if (error) throw error;
      return data as LogbookCertification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOGBOOK_CERTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: LOGBOOK_MODE_KEY });
    },
  });
};
