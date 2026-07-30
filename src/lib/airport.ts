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

/**
 * Formats a stored location for display, using the airport name the API
 * resolved for it.
 *
 * Only the location itself is stored on a flight; the name is resolved per
 * request from the backend's airport database and is null whenever the value
 * does not match a known airport — an off-airport site, or a code the database
 * does not carry. In that case the raw stored value is shown unchanged.
 */
export function formatAirportLabel(
  location: string | null | undefined,
  name: string | null | undefined,
  fallback = '—'
): string {
  const code = location?.trim();
  if (!code) return fallback;
  return name ? `${name} (${code})` : code;
}
