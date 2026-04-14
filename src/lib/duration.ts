/**
 * Duration utility functions for converting between minutes (internal storage)
 * and human-readable display formats.
 *
 * All flight times are stored as integer minutes in the API.
 * Display format depends on user preference: "hm" (1h 30m) or "decimal" (1.5h).
 */

export type TimeDisplayFormat = 'hm' | 'decimal';
export type DecimalSeparator = 'comma' | 'dot';

/**
 * Format a duration in minutes to the user's preferred display format.
 */
export function formatDuration(
  minutes: number,
  format: TimeDisplayFormat = 'hm',
  decimalSeparator: DecimalSeparator = 'dot',
): string {
  if (minutes === 0) return format === 'hm' ? '0h 0m' : '0.0h';

  if (format === 'hm') {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  // decimal format
  const hours = minutes / 60;
  const formatted = hours.toFixed(1);
  if (decimalSeparator === 'comma') {
    return `${formatted.replace('.', ',')}h`;
  }
  return `${formatted}h`;
}

/**
 * Format minutes to colon-separated hours:minutes (e.g., "1:23").
 * Suitable for EASA logbook display.
 */
export function formatColonHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Parse a flexible duration string into integer minutes.
 *
 * Accepted formats:
 * - "1:23" or "01:23" → 83 minutes (colon-separated hours:minutes)
 * - "1h23m" or "1h 23m" → 83 minutes
 * - "1h" → 60 minutes
 * - "23m" → 23 minutes
 * - "83" → 83 minutes (bare integer = minutes)
 * - "1.38" or "1.5" → decimal hours converted to minutes (83 or 90)
 *
 * Returns null if input is invalid.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // Colon format: "1:23"
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const mins = parseInt(colonMatch[2], 10);
    if (mins >= 60) return null;
    return hours * 60 + mins;
  }

  // "Xh Ym" format
  if (/[hHmM]/.test(s)) {
    const lower = s.toLowerCase();
    const hmMatch = lower.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/);
    if (hmMatch && (hmMatch[1] || hmMatch[2])) {
      const hours = hmMatch[1] ? parseInt(hmMatch[1], 10) : 0;
      const mins = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
      return hours * 60 + mins;
    }
    return null;
  }

  // Decimal hours (contains dot)
  if (s.includes('.')) {
    const hours = parseFloat(s);
    if (isNaN(hours) || hours < 0) return null;
    return Math.round(hours * 60);
  }

  // Bare integer = minutes
  const mins = parseInt(s, 10);
  if (isNaN(mins) || mins < 0) return null;
  return mins;
}

/**
 * Convert minutes to decimal hours (for calculations/display).
 */
export function minutesToDecimalHours(minutes: number): number {
  return minutes / 60;
}

/**
 * Convert decimal hours to integer minutes.
 */
export function decimalHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}
