import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  FLIGHT_DEPENDENT_QUERY_KEYS,
  invalidateFlightDependentQueries,
} from '../../hooks/invalidation';

describe('invalidateFlightDependentQueries', () => {
  it('invalidates every flight-dependent query key', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateFlightDependentQueries(queryClient);

    expect(spy).toHaveBeenCalledTimes(FLIGHT_DEPENDENT_QUERY_KEYS.length);
    for (const key of FLIGHT_DEPENDENT_QUERY_KEYS) {
      expect(spy).toHaveBeenCalledWith({ queryKey: key });
    }
  });

  it('covers dashboard time/landing stats query keys', () => {
    // Regression guard for ninerlog-frontend#33: stats must reload when
    // flights are created/updated/deleted/imported.
    const flatKeys = FLIGHT_DEPENDENT_QUERY_KEYS.map((k) => k[0]);
    expect(flatKeys).toEqual(
      expect.arrayContaining([
        'flights',
        'statistics',
        'my-statistics',
        'currency',
        'stats',
        'statsByClass',
        'trends',
      ]),
    );
  });
});
