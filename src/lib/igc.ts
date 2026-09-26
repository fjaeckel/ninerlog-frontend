import type { TFunction } from 'i18next';
import type { components } from '../api/schema';
import type { IgcRequestError } from '../hooks/useFlightFiles';

type IgcPlace = components['schemas']['IgcPlace'];

/** IGC file extension accepted by the pickers. */
export const IGC_ACCEPT = '.igc';

/** Default size limit of one IGC file, used until `/features` answers. */
export const DEFAULT_IGC_MAX_BYTES = 5 * 1024 * 1024;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Confidence band of a launch-method detection: high from 0.8, medium from 0.6. */
export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/** Coordinates as the API writes them into a flight: `50.49889N 9.95389E`. */
export function formatCoordinates(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}${ns} ${Math.abs(lon).toFixed(5)}${ew}`;
}

/** Code, name and coordinates of a place; code and name are null when no airport is within 3 km. */
export function describePlace(place: IgcPlace): { code: string | null; name: string | null; coordinates: string } {
  return {
    code: place.icao || null,
    name: place.name || null,
    coordinates: formatCoordinates(place.lat, place.lon),
  };
}

/** Translation key under `launchMethods` for an API launch method. */
export const launchMethodKey = (method: string): string => (method === 'self-launch' ? 'selfLaunch' : method);

/** Path of the IGC import; with a flight id, the files are attached to it. */
export const igcImportPath = (flightId?: string): string =>
  flightId ? `/flights/import-igc?flight=${encodeURIComponent(flightId)}` : '/flights/import-igc';

/** Message for a failed IGC request. */
export function igcErrorMessage(t: TFunction, error: IgcRequestError, maxMb: number): string {
  switch (error.status) {
    case 400:
      return error.message ? error.message.charAt(0).toUpperCase() + error.message.slice(1) : t('igc.errors.invalid');
    case 413:
      return t('igc.errors.tooLarge', { size: maxMb });
    case 409:
      return error.existingFlightId || !error.message ? t('igc.errors.duplicate') : error.message;
    case 404:
      return t('igc.errors.notFound');
    default:
      return t('igc.errors.generic');
  }
}
