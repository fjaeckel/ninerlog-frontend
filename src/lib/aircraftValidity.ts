import type { components } from '../api/schema';

type Aircraft = components['schemas']['Aircraft'];

type Validity = Pick<Aircraft, 'validFrom' | 'validTo'>;

/** Today's UTC calendar date as `YYYY-MM-DD`. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whether `date` (`YYYY-MM-DD`) lies inside the aircraft's validity range; null bounds are open. */
export function coversDate(ac: Validity, date: string): boolean {
  if (ac.validFrom && date < ac.validFrom) return false;
  if (ac.validTo && date > ac.validTo) return false;
  return true;
}

/** Whether the aircraft carries a validity range at all. */
export function hasValidity(ac: Validity): boolean {
  return !!ac.validFrom || !!ac.validTo;
}

/**
 * The fleet entry registered as `registration` on `date`, or undefined.
 * An empty date resolves against today.
 */
export function resolveAircraft<T extends Aircraft>(
  fleet: readonly T[] | undefined,
  registration: string,
  date?: string,
): T | undefined {
  const reg = registration.trim().toUpperCase();
  if (!reg || !fleet) return undefined;
  const day = date || todayUtc();
  return fleet.find((ac) => ac.registration.toUpperCase() === reg && coversDate(ac, day));
}

/** Whether any fleet entry carries `registration`, whatever its dates. */
export function hasRegistration(fleet: readonly Aircraft[] | undefined, registration: string): boolean {
  const reg = registration.trim().toUpperCase();
  return !!reg && !!fleet?.some((ac) => ac.registration.toUpperCase() === reg);
}
