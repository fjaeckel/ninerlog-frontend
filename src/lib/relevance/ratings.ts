import type { Disciplines } from '../../hooks/usePilotProfile';
import { classDiscipline, isDormantClass } from './classes';

interface RatingLike {
  classType: string;
}

/** Sort rank of a rating: active or training discipline 0, switched off 1, dormant 2. */
export function ratingRank(d: Disciplines, r: RatingLike): number {
  if (isDormantClass(d, r.classType)) return 2;
  const disc = classDiscipline(r.classType);
  if (disc && d.isReady && d.mode !== 'everything' && d.status(disc) === 'off') return 1;
  return 0;
}

/** Ratings ordered active disciplines first and dormant ones last; ties keep their order. */
export function sortRatingsByDiscipline<T extends RatingLike>(d: Disciplines, ratings: readonly T[]): T[] {
  return ratings
    .map((r, i) => ({ r, i, k: ratingRank(d, r) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((e) => e.r);
}
