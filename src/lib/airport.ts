/**
 * Normalizes a departure/arrival location value.
 *
 * Airport/arrival fields accept either a real ICAO code (which the backend
 * resolves to coordinates for the map and distance calculations) or free text
 * for off-airport sites that helicopter and glider pilots operate from
 * ("Meadow strip", "North field", ...).
 *
 * Values that look like a code — up to 4 alphanumeric characters — are
 * upper-cased so ICAO codes stay canonical. Anything longer or containing
 * spaces/punctuation is treated as a place name and its casing is preserved.
 */
export function normalizeLocation(value: string): string {
  const trimmed = value.trim();
  return /^[a-z0-9]{1,4}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}
