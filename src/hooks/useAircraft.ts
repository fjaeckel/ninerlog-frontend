import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Aircraft = components['schemas']['Aircraft'];
type AircraftCreate = components['schemas']['AircraftCreate'];
type AircraftUpdate = components['schemas']['AircraftUpdate'];
type AircraftStats = components['schemas']['AircraftStats'];
type AircraftTypeStats = components['schemas']['AircraftTypeStats'];
type PaginatedAircraft = components['schemas']['PaginatedAircraft'];

export type { Aircraft, AircraftCreate, AircraftUpdate, AircraftStats, AircraftTypeStats };

export interface AircraftStatsData {
  /** Per-registration stats, keyed by uppercased registration */
  byReg: Map<string, AircraftStats>;
  /** Per-type stats, keyed by uppercased type designation */
  byType: Map<string, AircraftTypeStats>;
}

/** Largest page the API serves; a fleet this size or smaller costs one request. */
const AIRCRAFT_PAGE_SIZE = 500;

/** Loop guard, far above any real fleet. */
const AIRCRAFT_MAX_PAGES = 20;

/** How long the fleet stays fresh. Mutations invalidate `['aircraft']` regardless. */
export const AIRCRAFT_STALE_TIME_MS = 60_000;

/**
 * The user's complete fleet, ordered by registration. Pages through the API
 * until every aircraft is retrieved, so callers that render or search the whole
 * fleet — the aircraft list, the flight-form autocomplete — see all of it.
 */
export const useAircraft = () => {
  return useQuery({
    queryKey: ['aircraft'],
    queryFn: async (): Promise<Aircraft[]> => {
      const all: Aircraft[] = [];
      for (let page = 1; page <= AIRCRAFT_MAX_PAGES; page++) {
        const { data, error } = await apiClient.GET('/aircraft', {
          params: { query: { page, pageSize: AIRCRAFT_PAGE_SIZE } },
        });
        if (error) throw error;
        const paginated = data as PaginatedAircraft | undefined;
        all.push(...(paginated?.data ?? []));
        const pagination = paginated?.pagination;
        if (!pagination || page >= pagination.totalPages) break;
      }
      return all;
    },
    staleTime: AIRCRAFT_STALE_TIME_MS,
  });
};

/** Per-registration and per-type flight statistics, keyed uppercased. */
export const useAircraftStats = () => {
  return useQuery({
    queryKey: ['aircraft', 'stats'],
    queryFn: async (): Promise<AircraftStatsData> => {
      const { data, error } = await apiClient.GET('/aircraft/stats');
      if (error) throw error;
      const byReg = new Map<string, AircraftStats>();
      for (const s of data?.data ?? []) {
        byReg.set(s.registration.toUpperCase(), s);
      }
      const byType = new Map<string, AircraftTypeStats>();
      for (const s of data?.byType ?? []) {
        byType.set(s.aircraftType.toUpperCase(), s);
      }
      return { byReg, byType };
    },
  });
};

export const useAircraftById = (aircraftId: string) => {
  return useQuery({
    queryKey: ['aircraft', aircraftId],
    queryFn: async (): Promise<Aircraft> => {
      const { data, error } = await apiClient.GET('/aircraft/{aircraftId}', {
        params: { path: { aircraftId } },
      });
      if (error) throw error;
      return data as Aircraft;
    },
    enabled: !!aircraftId,
  });
};

export const useCreateAircraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AircraftCreate): Promise<Aircraft> => {
      const { data: result, error } = await apiClient.POST('/aircraft', {
        body: data as any,
      });
      if (error) throw error;
      return result as Aircraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });
};

export const useUpdateAircraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AircraftUpdate }): Promise<Aircraft> => {
      const { data: result, error } = await apiClient.PATCH('/aircraft/{aircraftId}', {
        params: { path: { aircraftId: id } },
        body: data as any,
      });
      if (error) throw error;
      return result as Aircraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });
};

export const useDeleteAircraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/aircraft/{aircraftId}', {
        params: { path: { aircraftId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
    },
  });
};
