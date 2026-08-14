import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys that depend on the user's flight log and must be refreshed
 * whenever flights are created, updated, deleted, or imported.
 */
export const FLIGHT_DEPENDENT_QUERY_KEYS: readonly (readonly unknown[])[] = [
  ['flights'],
  ['statistics'],
  ['my-statistics'],
  ['currency'],
  ['stats'],
  ['statsByClass'],
  ['trends'],
  ['aircraft', 'stats'],
  // Saving a flight creates a contact for every crew name the address book
  // does not have yet, so the People list grows as a side effect of logging.
  ['contacts'],
];

/**
 * Invalidate all queries that depend on the user's flight log.
 * Call from mutation onSuccess handlers when flights change.
 */
export function invalidateFlightDependentQueries(queryClient: QueryClient): void {
  for (const queryKey of FLIGHT_DEPENDENT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
  }
}
