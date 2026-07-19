/**
 * Informational 90-day landing recency, styled after EASA FCL.060(b) day
 * recency (3 landings in the preceding 90 days). This is a familiarity
 * indicator per aircraft type/registration — the regulatory per-class
 * evaluation lives in the currency engine.
 */

export const RECENCY_REQUIRED_LANDINGS = 3;

export type RecencyLevel = 'current' | 'low' | 'none';

export function recencyLevel(landingsLast90Days: number): RecencyLevel {
  if (landingsLast90Days >= RECENCY_REQUIRED_LANDINGS) return 'current';
  if (landingsLast90Days > 0) return 'low';
  return 'none';
}

/** Badge classes matching the app's current/expiring/expired styling */
export const RECENCY_BADGE_CLASSES: Record<RecencyLevel, string> = {
  current: 'badge-current',
  low: 'badge-expiring',
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

/** Dot color classes for compact indicators */
export const RECENCY_DOT_CLASSES: Record<RecencyLevel, string> = {
  current: 'bg-green-500',
  low: 'bg-amber-500',
  none: 'bg-slate-300 dark:bg-slate-600',
};
