/**
 * Normalizes a departure/arrival location value: code-like values (up to 4
 * alphanumeric characters) are upper-cased; free-text site names keep their
 * casing.
 */
export function normalizeLocation(value: string): string {
  const trimmed = value.trim();
  return /^[a-z0-9]{1,4}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

/**
 * Formats a stored location for display as "Name (CODE)", falling back to the
 * raw stored value when no airport name resolved.
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
 * Shortens a free-text site name: keeps the part before the first comma, then
 * as many whole words as fit in `maxChars`.
 */
export function abbreviateSiteName(name: string, maxChars = 14): string {
  // Strip a leading separator.
  const trimmed = name.trim().replace(/^[\s,;·–-]+/, '');
  const head = trimmed.split(',')[0].trim();
  const base = head.length >= 3 ? head : trimmed;
  if (base.length <= maxChars) return base;

  // As many whole words as fit.
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
 * Splits a stored location into code and name. Free-text sites return the
 * stored value as `name` with `code` null.
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
  // Resolved name when available, else the free-text value.
  return resolvedName ? { code: null, name: resolvedName } : { code: null, name: value };
}
