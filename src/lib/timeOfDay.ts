export type ClockFormat = '24h' | '12h';

const CANONICAL = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Whether `value` is a canonical 24-hour `HH:MM` string. */
export function isCanonicalTime(value: string): boolean {
  return CANONICAL.test(value);
}

/**
 * Format a stored time of day (`HH:MM` or `HH:MM:SS`) for display.
 * Returns the input unchanged when it is not a recognisable time.
 */
export function formatTimeOfDay(value: string | null | undefined, clock: ClockFormat = '24h'): string {
  if (!value) return '';
  const hhmm = value.slice(0, 5);
  if (!isCanonicalTime(hhmm)) return value;
  if (clock === '24h') return hhmm;
  const h = Number(hhmm.slice(0, 2));
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${hhmm.slice(3)} ${suffix}`;
}

/**
 * Parse typed time-of-day input into canonical `HH:MM`.
 * Accepts `14:30`, `14.30`, `14,30`, `14h30`, `1430`, `930`, `9`, and 12-hour forms
 * such as `2:30 PM`, `2:30p`, `230pm`, `12 am`. Returns `''` for blank input
 * and `null` when the input is not a valid time.
 */
export function parseTimeOfDay(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (raw === '') return '';

  const m = raw.match(/^(\d{1,2})(?:\s*[:.,h]\s*(\d{2})|(\d{2}))?\s*(a|p|am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;

  let hours = Number(m[1]);
  const minutes = Number(m[2] ?? m[3] ?? '0');
  const meridiem = m[4]?.[0];

  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'a') hours = hours === 12 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
  } else if (hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
