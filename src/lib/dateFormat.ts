import { format } from 'date-fns';
import type { ClockFormat } from './timeOfDay';

export type DateFormatPref = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

const dateFnsPatterns: Record<DateFormatPref, string> = {
  'DD.MM.YYYY': 'dd.MM.yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const clockPatterns: Record<ClockFormat, string> = {
  '24h': 'HH:mm',
  '12h': 'h:mm a',
};

const dateFnsLongPatterns: Record<DateFormatPref, string> = {
  'DD.MM.YYYY': 'EEEE, d. MMMM yyyy',
  'MM/DD/YYYY': 'EEEE, MMMM d, yyyy',
  'YYYY-MM-DD': 'EEEE, yyyy-MM-dd',
};

/**
 * Format a date using the user's preferred date format.
 */
export function formatDate(date: Date | string, dateFormat: DateFormatPref = 'DD.MM.YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, dateFnsPatterns[dateFormat] || dateFnsPatterns['DD.MM.YYYY']);
}

/**
 * Format a date with time using the user's preferred date and clock formats.
 */
export function formatDateTime(
  date: Date | string,
  dateFormat: DateFormatPref = 'DD.MM.YYYY',
  clock: ClockFormat = '24h',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePattern = dateFnsPatterns[dateFormat] || dateFnsPatterns['DD.MM.YYYY'];
  return format(d, `${datePattern} ${clockPatterns[clock] || clockPatterns['24h']}`);
}

/**
 * Format the local time-of-day part of an instant using the user's clock format.
 */
export function formatClockTime(date: Date | string, clock: ClockFormat = '24h'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, clockPatterns[clock] || clockPatterns['24h']);
}

/**
 * Format a date in long/verbose format (for detail pages).
 */
export function formatDateLong(date: Date | string, dateFormat: DateFormatPref = 'DD.MM.YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, dateFnsLongPatterns[dateFormat] || dateFnsLongPatterns['DD.MM.YYYY']);
}
