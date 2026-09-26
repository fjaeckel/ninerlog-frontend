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
  ['custom-reports', 'result'],
  ['custom-reports', 'preview'],
  ['pilot-profile'],
  ['training-progress'],
];

/** Query key of `GET /users/me/pilot-profile`. */
export const PILOT_PROFILE_QUERY_KEY = ['pilot-profile'] as const;

/** Query key prefix of `GET /training/progress`. */
export const TRAINING_PROGRESS_QUERY_KEY = ['training-progress'] as const;

/** Invalidate training progress, whose programmes follow the pilot profile's training disciplines. */
export function invalidateTrainingProgress(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: [...TRAINING_PROGRESS_QUERY_KEY] });
}

/** Invalidate the pilot profile, whose evidence derives from licences, ratings and aircraft, and training progress with it. */
export function invalidatePilotProfile(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: [...PILOT_PROFILE_QUERY_KEY] });
  invalidateTrainingProgress(queryClient);
}

/**
 * Invalidate all queries that depend on the user's flight log.
 * Call from mutation onSuccess handlers when flights change.
 */
export function invalidateFlightDependentQueries(queryClient: QueryClient): void {
  for (const queryKey of FLIGHT_DEPENDENT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
  }
}
