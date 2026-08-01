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

/** A stored location split into its code and its human-readable name. */
export interface AirportParts {
  /** The ICAO/local code, or null when the location is a free-text site name. */
  code: string | null;
  /** The resolved airport name, or the raw free-text site name. */
  name: string | null;
}

/**
 * Shortens a free-text site name to something that still names the place.
 *
 * Off-airport locations are written the way a pilot would say them — "Meadow
 * strip near Kassel", "North field, Bad Hersfeld-Johannesberg" — and a list row
 * has nowhere near that much width. Clipping the string mid-word leaves
 * "Mead…", which identifies nothing, so this cuts where the meaning is: the
 * part before the comma is the site itself and the rest is the town it is near,
 * and anything still too long gives up whole words rather than half of one.
 *
 * The full value stays available in a `title` and on the detail page.
 */
export function abbreviateSiteName(name: string, maxChars = 14): string {
  // A leading separator would otherwise make the first fragment empty and
  // abbreviate the name down to punctuation.
  const trimmed = name.trim().replace(/^[\s,;·–-]+/, '');
  const head = trimmed.split(',')[0].trim();
  const base = head.length >= 3 ? head : trimmed;
  if (base.length <= maxChars) return base;

  // As many whole words as fit — "Meadow strip", not "Meadow stri".
  let kept = '';
  for (const word of base.split(/\s+/)) {
    const next = kept ? `${kept} ${word}` : word;
    if (next.length > maxChars) break;
    kept = next;
  }
  // Only cut inside a word when the first word alone already overruns.
  return `${kept || base.slice(0, maxChars)}…`;
}

/**
 * Splits a stored location into a code and a name so a layout can give each its
 * own typography instead of squeezing "Name (CODE)" into a single string.
 *
 * Free-text off-airport sites have no code — the stored value *is* the name, so
 * it is returned as `name` and `code` stays null.
 */
export function splitAirportLabel(
  location: string | null | undefined,
  name: string | null | undefined,
  fallback = '—'
): AirportParts {
  const value = location?.trim();
  if (!value) return { code: fallback, name: null };

  const resolvedName = name?.trim() || null;
  if (/^[a-z0-9]{1,4}$/i.test(value)) {
    return { code: value.toUpperCase(), name: resolvedName };
  }
  // A location the database could still resolve keeps its name; otherwise the
  // free-text value itself is all we have to show.
  return resolvedName ? { code: null, name: resolvedName } : { code: null, name: value };
}
