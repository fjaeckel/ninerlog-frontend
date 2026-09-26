import { getFeature, useRelevance, type Aircraft } from '../lib/relevance';

/** Whether circuits mode is offered: any of `aircraft` is a sailplane, or the glider toolkit is relevant (failing open). */
export function useCircuitsMode(aircraft: readonly (Aircraft | null | undefined)[]): boolean {
  const { visible } = useRelevance('flight.circuitsMode');
  const match = getFeature('flight.circuitsMode')?.aircraftMatch;
  return visible || aircraft.some((ac) => !!ac && !!match?.(ac));
}
