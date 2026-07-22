import { describe, it, expect } from 'vitest';
import { normalizeLocation } from '../../lib/airport';

describe('normalizeLocation', () => {
  it('upper-cases values that look like an ICAO code', () => {
    expect(normalizeLocation('eddf')).toBe('EDDF');
    expect(normalizeLocation('lszh')).toBe('LSZH');
  });

  it('upper-cases short local identifiers (1-4 alphanumeric chars)', () => {
    expect(normalizeLocation('x3')).toBe('X3');
    expect(normalizeLocation('kjfk')).toBe('KJFK');
    expect(normalizeLocation('12a')).toBe('12A');
  });

  it('preserves casing for free-text place names', () => {
    expect(normalizeLocation('Meadow strip')).toBe('Meadow strip');
    expect(normalizeLocation("Grandpa's field")).toBe("Grandpa's field");
    expect(normalizeLocation('north pasture')).toBe('north pasture');
  });

  it('preserves casing for anything longer than 4 characters', () => {
    expect(normalizeLocation('eddfx')).toBe('eddfx');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeLocation('  eddf  ')).toBe('EDDF');
    expect(normalizeLocation('  Meadow strip  ')).toBe('Meadow strip');
  });
});
