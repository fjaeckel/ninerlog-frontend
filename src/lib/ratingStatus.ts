import type { RatingCurrencyStatus } from '../types/api';

const KNOWN_RATING_STATUSES: readonly RatingCurrencyStatus[] = ['current', 'expiring', 'expired', 'lapsed', 'unknown'];

/**
 * Normalises a class rating status from the API. A status this build does not
 * know renders as `expired` (not current), never as current.
 */
export function ratingStatus(status: string | null | undefined): RatingCurrencyStatus {
  return KNOWN_RATING_STATUSES.includes(status as RatingCurrencyStatus)
    ? (status as RatingCurrencyStatus)
    : 'expired';
}

/** True for statuses that need the pilot's action: expiring, expired, lapsed, or an unrecognised status. */
export function isRatingAlert(status: string | null | undefined): boolean {
  const s = ratingStatus(status);
  return s === 'expiring' || s === 'expired' || s === 'lapsed';
}

/** True when the privileges may not be exercised now: expired, lapsed, or an unrecognised status. */
export function isRatingNotCurrent(status: string | null | undefined): boolean {
  const s = ratingStatus(status);
  return s === 'expired' || s === 'lapsed';
}
