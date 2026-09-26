import { normalizeAircraftClass } from './aircraftClass';

interface LaunchAircraft {
  aircraftClass?: string | null;
  ulKind?: string | null;
}

/** Whether the aircraft is a sailplane: class GLIDER, or ULTRALIGHT of kind SAILPLANE. */
export function isSailplane(ac: LaunchAircraft | null | undefined): boolean {
  if (!ac) return false;
  const cls = normalizeAircraftClass(ac.aircraftClass);
  if (cls === 'GLIDER') return true;
  return cls === 'ULTRALIGHT' && normalizeAircraftClass(ac.ulKind) === 'SAILPLANE';
}

/**
 * Whether the flight form shows the launch-method field: for a sailplane, or
 * whenever the flight already carries a launch method.
 */
export function showsLaunchMethod(
  ac: LaunchAircraft | null | undefined,
  storedLaunchMethod?: string | null,
): boolean {
  return !!storedLaunchMethod || isSailplane(ac);
}

/** Launch methods, in picker order. */
export const LAUNCH_METHODS = ['winch', 'aerotow', 'self-launch', 'car', 'bungee'] as const;
export type LaunchMethod = (typeof LAUNCH_METHODS)[number];

/** Whether `v` is a known launch method. */
export const isLaunchMethod = (v: unknown): v is LaunchMethod =>
  typeof v === 'string' && (LAUNCH_METHODS as readonly string[]).includes(v);
