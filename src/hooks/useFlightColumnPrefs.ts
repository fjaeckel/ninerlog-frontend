import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { FlightColumnKey, FlightColumnPrefs } from '../components/flights/flightTableColumns';
import { DEFAULT_FLIGHT_COLUMN_PREFS } from '../components/flights/flightTableColumns';

/**
 * The user's choice of optional flights-list columns.
 * Unset state falls back to automatic mode.
 */
export function useFlightColumnPrefs(): FlightColumnPrefs {
  const mode = useAuthStore((s) => s.user?.flightListColumnMode);
  const columns = useAuthStore((s) => s.user?.flightListColumns);

  return useMemo(() => {
    if (mode !== 'custom') return DEFAULT_FLIGHT_COLUMN_PREFS;
    return { mode: 'custom', columns: (columns ?? []) as FlightColumnKey[] };
  }, [mode, columns]);
}
