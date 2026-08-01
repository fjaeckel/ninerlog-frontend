import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components, operations } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

type Flight = components['schemas']['Flight'];
type FlightCreate = components['schemas']['FlightCreate'];
type FlightUpdate = components['schemas']['FlightUpdate'];
type PaginatedFlights = components['schemas']['PaginatedFlights'];
type ListFlightsParams = operations['listFlights']['parameters']['query'];

/**
 * How long a flights page stays fresh.
 *
 * The global default is `staleTime: 0`, which combined with `refetchOnMount`
 * and `refetchOnWindowFocus` meant this query re-ran on every tab refocus and
 * every back-navigation from a flight's detail page. For a free-text search
 * that is the most expensive read in the app, charged against its own rate
 * limit — three refocuses measurably cost three extra searches. The same
 * applied to the `pageSize: 1` probe Layout issues on every page of the app.
 *
 * A window of freshness is safe here because it does not delay the user's own
 * edits: every flight mutation calls `invalidateFlightDependentQueries`, and
 * invalidation overrides `staleTime`. What it defers is picking up a change
 * made in *another* tab or by another device, which is worth up to this long.
 */
export const FLIGHTS_STALE_TIME_MS = 30_000;

// Get paginated list of flights
export const useFlights = (params?: ListFlightsParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['flights', params],
    queryFn: async (): Promise<PaginatedFlights> => {
      const { data, error } = await apiClient.GET('/flights', {
        params: { query: params || {} },
      });
      if (error) throw error;
      return data as PaginatedFlights;
    },
    placeholderData: keepPreviousData,
    staleTime: FLIGHTS_STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  });
};

/**
 * The same list, page after page, for the phone's endless scroll.
 *
 * A separate query from `useFlights` rather than a replacement: a table is
 * read a page at a time and a scrolling list is not, and the two want their
 * pages cached differently. Only one of them runs at a time — the flights page
 * enables whichever the viewport calls for — so this costs no extra requests.
 *
 * `page` is left out of the caller's params on purpose: the pages are this
 * query's business, and passing one in would make the same list cache twice.
 */
export const useInfiniteFlights = (
  params?: Omit<ListFlightsParams, 'page'>,
  options?: { enabled?: boolean }
) => {
  return useInfiniteQuery({
    queryKey: ['flights', 'infinite', params],
    queryFn: async ({ pageParam }): Promise<PaginatedFlights> => {
      const { data, error } = await apiClient.GET('/flights', {
        params: { query: { ...(params || {}), page: pageParam } },
      });
      if (error) throw error;
      return data as PaginatedFlights;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination && last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    staleTime: FLIGHTS_STALE_TIME_MS,
    enabled: options?.enabled ?? true,
  });
};

// Get a single flight by ID
export const useFlight = (flightId: string) => {
  return useQuery({
    queryKey: ['flights', flightId],
    queryFn: async (): Promise<Flight> => {
      const { data, error } = await apiClient.GET('/flights/{flightId}', {
        params: { path: { flightId } },
      });
      if (error) throw error;
      return data as Flight;
    },
    enabled: !!flightId,
  });
};

// Create a new flight
export const useCreateFlight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flightData: FlightCreate): Promise<Flight> => {
      const { data, error } = await apiClient.POST('/flights', {
        body: flightData as any,
      });
      if (error) throw error;
      return data as Flight;
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
    },
  });
};

// Update an existing flight
export const useUpdateFlight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: FlightUpdate }): Promise<Flight> => {
      const { data, error } = await apiClient.PUT('/flights/{flightId}', {
        params: { path: { flightId: id } },
        body: updateData as any,
      });
      if (error) throw error;
      return data as Flight;
    },
    onSuccess: (data) => {
      invalidateFlightDependentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['flights', data.id] });
    },
  });
};

// Delete a flight
export const useDeleteFlight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/flights/{flightId}', {
        params: { path: { flightId: id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
    },
  });
};
