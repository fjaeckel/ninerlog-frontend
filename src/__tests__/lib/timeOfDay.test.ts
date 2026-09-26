import { describe, it, expect } from 'vitest';
import { formatTimeOfDay, isCanonicalTime, parseTimeOfDay } from '../../lib/timeOfDay';

describe('formatTimeOfDay', () => {
  it('shows 24-hour HH:MM and drops seconds', () => {
    expect(formatTimeOfDay('14:30:00', '24h')).toBe('14:30');
    expect(formatTimeOfDay('07:05', '24h')).toBe('07:05');
  });

  it('shows 12-hour with AM/PM', () => {
    expect(formatTimeOfDay('14:30:00', '12h')).toBe('2:30 PM');
    expect(formatTimeOfDay('00:15', '12h')).toBe('12:15 AM');
    expect(formatTimeOfDay('12:00', '12h')).toBe('12:00 PM');
    expect(formatTimeOfDay('09:45', '12h')).toBe('9:45 AM');
  });

  it('defaults to 24-hour', () => {
    expect(formatTimeOfDay('23:59')).toBe('23:59');
  });

  it('returns empty for missing values and passes through unparseable text', () => {
    expect(formatTimeOfDay(undefined)).toBe('');
    expect(formatTimeOfDay(null, '12h')).toBe('');
    expect(formatTimeOfDay('25:00', '12h')).toBe('25:00');
  });
});

describe('parseTimeOfDay', () => {
  it.each([
    ['14:30', '14:30'],
    ['14.30', '14:30'],
    ['14,30', '14:30'],
    ['14h30', '14:30'],
    ['1430', '14:30'],
    ['930', '09:30'],
    ['9', '09:00'],
    ['0', '00:00'],
    ['  7:05 ', '07:05'],
    ['2:30 PM', '14:30'],
    ['2:30pm', '14:30'],
    ['230p', '14:30'],
    ['12 am', '00:00'],
    ['12:15 AM', '00:15'],
    ['12 pm', '12:00'],
    ['11:59 p.m.', '23:59'],
  ])('parses %j as %s', (input, expected) => {
    expect(parseTimeOfDay(input)).toBe(expected);
  });

  it('returns empty string for blank input', () => {
    expect(parseTimeOfDay('')).toBe('');
    expect(parseTimeOfDay('   ')).toBe('');
  });

  it.each(['24:00', '14:60', '13 pm', '0 am', 'abc', '14:3', '1:2:3', '12345'])('rejects %j', (input) => {
    expect(parseTimeOfDay(input)).toBeNull();
  });
});

describe('isCanonicalTime', () => {
  it('accepts only HH:MM', () => {
    expect(isCanonicalTime('00:00')).toBe(true);
    expect(isCanonicalTime('23:59')).toBe(true);
    expect(isCanonicalTime('9:00')).toBe(false);
    expect(isCanonicalTime('24:00')).toBe(false);
    expect(isCanonicalTime('14:30:00')).toBe(false);
  });
});
