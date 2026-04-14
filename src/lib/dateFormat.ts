import { format } from 'date-fns';

export type DateFormatPref = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

const dateFnsPatterns: Record<DateFormatPref, string> = {
  'DD.MM.YYYY': 'dd.MM.yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const dateFnsWithTimePatterns: Record<DateFormatPref, string> = {
  'DD.MM.YYYY': 'dd.MM.yyyy HH:mm',
  'MM/DD/YYYY': 'MM/dd/yyyy HH:mm',
  'YYYY-MM-DD': 'yyyy-MM-dd HH:mm',
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
 * Format a date with time using the user's preferred date format.
 */
export function formatDateTime(date: Date | string, dateFormat: DateFormatPref = 'DD.MM.YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, dateFnsWithTimePatterns[dateFormat] || dateFnsWithTimePatterns['DD.MM.YYYY']);
}

/**
 * Format a date in long/verbose format (for detail pages).
 */
export function formatDateLong(date: Date | string, dateFormat: DateFormatPref = 'DD.MM.YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, dateFnsLongPatterns[dateFormat] || dateFnsLongPatterns['DD.MM.YYYY']);
}
