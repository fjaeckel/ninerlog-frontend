import type { components } from '../api/schema';

export type FlightTimeMethod = components['schemas']['FlightTimeMethod'];

export function parseHobbsReading(value: string): number | null {
  const match = /^(\d{1,7})(?:[.,](\d))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 10 + Number(match[2] ?? '0');
}

export function formatHobbsReading(value: number | null | undefined, separator: 'comma' | 'dot' = 'dot'): string {
  if (value == null) return '';
  return `${Math.floor(value / 10)}${separator === 'comma' ? ',' : '.'}${value % 10}`;
}

export function hobbsMinutes(start: string, end: string): number | null {
  const first = parseHobbsReading(start);
  const last = parseHobbsReading(end);
  return first === null || last === null || last <= first ? null : (last - first) * 6;
}
