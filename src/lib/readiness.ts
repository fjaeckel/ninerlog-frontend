import { addDays, format } from 'date-fns';
import type { Aircraft, AircraftStatsData } from '../hooks/useAircraft';
import type { ClassRatingCurrency } from '../types/api';

/** Days ahead of today `GET /currency/readiness` answers for. */
export const READINESS_MAX_DAYS_AHEAD = 366;

const ISO = 'yyyy-MM-dd';

/** The coming Saturday as YYYY-MM-DD; today when today is a Saturday. */
export function nextSaturday(today: Date = new Date()): string {
  return format(addDays(today, (6 - today.getDay() + 7) % 7), ISO);
}

/** First and last date the readiness endpoint answers for, as YYYY-MM-DD. */
export function readinessDateBounds(today: Date = new Date()): { min: string; max: string } {
  return { min: format(today, ISO), max: format(addDays(today, READINESS_MAX_DAYS_AHEAD), ISO) };
}

/**
 * The aircraft the card opens on: the most-flown active aircraft whose class
 * one of the pilot's ratings covers, else the most-flown active one, else none.
 */
export function defaultReadinessAircraft(
  fleet: Aircraft[],
  stats: AircraftStatsData | undefined,
  ratings: ClassRatingCurrency[],
): string | null {
  const flown = (a: Aircraft) => stats?.byReg.get(a.registration.toUpperCase())?.totalFlights ?? 0;
  const active = fleet
    .filter((a) => a.isActive !== false)
    .sort((a, b) => flown(b) - flown(a) || a.registration.localeCompare(b.registration));
  const held = new Set<string>(ratings.map((r) => r.classType));
  return (active.find((a) => !!a.aircraftClass && held.has(a.aircraftClass)) ?? active[0])?.registration ?? null;
}
