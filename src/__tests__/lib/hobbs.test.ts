import { describe, expect, it } from 'vitest';
import { formatHobbsReading, hobbsMinutes, parseHobbsReading } from '../../lib/hobbs';

describe('Hobbs readings', () => {
  it('H1: calculates exact integer minutes from the original meter readings', () => {
    expect(hobbsMinutes('1523.4', '1524.7')).toBe(78);
    expect(hobbsMinutes('0', '0.1')).toBe(6);
    expect(hobbsMinutes('9999999.8', '9999999.9')).toBe(6);
  });
  it('T1: accepts decimal commas and formats meter hours separately from durations', () => {
    expect(parseHobbsReading('1523,4')).toBe(15234);
    expect(formatHobbsReading(15234, 'comma')).toBe('1523,4');
    expect(formatHobbsReading(15234, 'dot')).toBe('1523.4');
    expect(formatHobbsReading(0)).toBe('0.0');
    expect(formatHobbsReading(undefined)).toBe('');
  });
  it.each(['', '-1', 'NaN', '1e3', '1:30', '1.23', '1.', '10000000', '1,234.5'])('rejects invalid reading %s', (value) => {
    expect(parseHobbsReading(value)).toBeNull();
    expect(hobbsMinutes(value, '1524.7')).toBeNull();
  });
  it('rejects equal, reversed or missing readings', () => {
    expect(hobbsMinutes('2', '2')).toBeNull();
    expect(hobbsMinutes('2', '1')).toBeNull();
    expect(hobbsMinutes('2', '')).toBeNull();
  });
});
