import type { DecimalSeparator, TimeDisplayFormat } from './duration';

const MAX_MINUTES = 2147483647n;

export function parseFlightTimeEntry(input: string, format: TimeDisplayFormat): number | null {
  const text = input.trim();
  if (!/^(?:\d{1,9}(?:[.,]\d{1,6})?|[.,]\d{1,6})$/.test(text)) return null;
  const [whole = '', fraction = ''] = text.replace(',', '.').split('.');
  const scale = 10n ** BigInt(fraction.length);
  const amount = BigInt(whole || '0') * scale + BigInt(fraction || '0');
  const hours = format === 'decimal' || fraction.length > 0;
  const minutes = hours ? (amount * 60n + scale / 2n) / scale : amount;
  return minutes <= MAX_MINUTES ? Number(minutes) : null;
}

export function formatFlightTimeEntry(minutes: number | undefined, format: TimeDisplayFormat, separator: DecimalSeparator): string {
  if (minutes === undefined || !Number.isFinite(minutes)) return '';
  if (format === 'hm') return String(minutes);
  let text = (minutes / 60).toFixed(minutes % 6 === 0 ? 1 : 2);
  if (separator === 'comma') text = text.replace('.', ',');
  return text;
}
