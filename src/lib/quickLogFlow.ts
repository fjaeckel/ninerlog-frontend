import type { components } from '../api/schema';
import { getFeature, type Aircraft } from './relevance';

type FlightSession = components['schemas']['FlightSession'];
type FlightSessionEventType = components['schemas']['FlightSessionEvent']['type'];

/** Whether Quick Log leads with take-off and landing for `ac`. */
export function leadsWithAirborne(ac: Aircraft | null | undefined): boolean {
  const match = getFeature('quicklog.airborneFirst')?.aircraftMatch;
  return !!ac && !!match?.(ac);
}

/** Whether the open session was opened at take-off, without block times. */
export const isAirborneSession = (session: FlightSession | null | undefined): boolean =>
  !!session && session.status === 'open' && !session.offBlockAt && !!session.takeoffAt;

/**
 * The first step the session still misses. A block-time session walks
 * offblock → takeoff → landing → onblock; an airborne one takeoff → landing.
 */
export function nextEventFor(session: FlightSession | null | undefined, airborneFirst: boolean): FlightSessionEventType {
  if (!session || session.status !== 'open') return airborneFirst ? 'takeoff' : 'offblock';
  if (!session.offBlockAt) return session.takeoffAt ? 'landing' : 'takeoff';
  if (!session.takeoffAt) return 'takeoff';
  if (!session.landingAt) return 'landing';
  return 'onblock';
}
