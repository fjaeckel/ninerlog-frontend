/** Standard aircraft classes offered in the class pickers, in picker order. */
export const AIRCRAFT_CLASSES = [
  'SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA',
  'SET_LAND', 'SET_SEA', 'TMG', 'GLIDER', 'ULTRALIGHT', 'GYROPLANE',
] as const;

export type AircraftClassOption = (typeof AIRCRAFT_CLASSES)[number];

interface ClassifiedAircraft {
  aircraftClass?: string | null;
  ulKind?: string | null;
}

/** Aircraft class trimmed and upper-cased; empty string when unset. */
export function normalizeAircraftClass(aircraftClass: string | null | undefined): string {
  return (aircraftClass ?? '').trim().toUpperCase();
}

/** Whether the aircraft lacks a class, or is ULTRALIGHT without a UL kind. */
export function needsClassification(ac: ClassifiedAircraft): boolean {
  const cls = normalizeAircraftClass(ac.aircraftClass);
  if (cls === '') return true;
  return cls === 'ULTRALIGHT' && !(ac.ulKind ?? '').trim();
}

/**
 * Class implied by a German registration: `D-` plus four digits is GLIDER,
 * `D-M…` is ULTRALIGHT. Returns null when the registration implies no single class.
 */
export function classFromRegistration(registration: string | null | undefined): AircraftClassOption | null {
  const reg = (registration ?? '').trim().toUpperCase();
  if (/^D-?\d{4}$/.test(reg)) return 'GLIDER';
  if (/^D-M[A-Z]{3}$/.test(reg)) return 'ULTRALIGHT';
  return null;
}
