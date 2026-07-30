import { describe, it, expect } from 'vitest';
import { normalizeLocation, formatAirportLabel, splitAirportLabel } from '../../lib/airport';

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

describe('formatAirportLabel', () => {
  it('combines the resolved name with the code', () => {
    expect(formatAirportLabel('EDDF', 'Frankfurt am Main Airport')).toBe(
      'Frankfurt am Main Airport (EDDF)'
    );
  });

  it('falls back to the raw location when no name was resolved', () => {
    expect(formatAirportLabel('EDDF', null)).toBe('EDDF');
    expect(formatAirportLabel('EDDF', undefined)).toBe('EDDF');
  });

  it('leaves free-text off-airport sites unchanged', () => {
    expect(formatAirportLabel('Meadow strip', null)).toBe('Meadow strip');
  });

  it('uses the fallback for empty or missing locations', () => {
    expect(formatAirportLabel(null, null)).toBe('—');
    expect(formatAirportLabel(undefined, null)).toBe('—');
    expect(formatAirportLabel('', null)).toBe('—');
    expect(formatAirportLabel('   ', null)).toBe('—');
    expect(formatAirportLabel(null, null, '?')).toBe('?');
  });

  it('trims the code it renders', () => {
    expect(formatAirportLabel('  EDDF  ', null)).toBe('EDDF');
  });
});

describe('splitAirportLabel', () => {
  it('keeps the code and the resolved name apart', () => {
    expect(splitAirportLabel('EDDF', 'Frankfurt am Main Airport')).toEqual({
      code: 'EDDF',
      name: 'Frankfurt am Main Airport',
    });
  });

  it('upper-cases the code and drops an empty name', () => {
    expect(splitAirportLabel('eddf', null)).toEqual({ code: 'EDDF', name: null });
    expect(splitAirportLabel('  eddf  ', '   ')).toEqual({ code: 'EDDF', name: null });
  });

  it('treats free-text off-airport sites as a name without a code', () => {
    expect(splitAirportLabel('Meadow strip', null)).toEqual({
      code: null,
      name: 'Meadow strip',
    });
  });

  it('prefers a resolved name over a long raw location', () => {
    expect(splitAirportLabel('Frankfurt', 'Frankfurt am Main Airport')).toEqual({
      code: null,
      name: 'Frankfurt am Main Airport',
    });
  });

  it('uses the fallback as the code for empty or missing locations', () => {
    expect(splitAirportLabel(null, null)).toEqual({ code: '—', name: null });
    expect(splitAirportLabel('  ', null)).toEqual({ code: '—', name: null });
    expect(splitAirportLabel(undefined, null, '?')).toEqual({ code: '?', name: null });
  });
});
