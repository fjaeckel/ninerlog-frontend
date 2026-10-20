import { describe, it, expect } from 'vitest';
import { classFromRegistration, needsClassification, normalizeAircraftClass } from '../../lib/aircraftClass';

describe('classFromRegistration', () => {
  it.each([
    ['D-1234', 'GLIDER'],
    ['d-5812', 'GLIDER'],
    [' D-0815 ', 'GLIDER'],
    ['D1234', 'GLIDER'],
    ['D-MIKA', 'ULTRALIGHT'],
    ['d-mnew', 'ULTRALIGHT'],
    ['D-KFAL', null],
    ['D-EABC', null],
    ['D-12345', null],
    ['D-123', null],
    ['D-M12', null],
    ['N12345', null],
    ['OE-9123', null],
    ['', null],
    [null, null],
  ])('%s → %s', (reg, want) => {
    expect(classFromRegistration(reg)).toBe(want);
  });
});

describe('needsClassification', () => {
  it.each([
    [{ aircraftClass: null }, true],
    [{ aircraftClass: '' }, true],
    [{ aircraftClass: '  ' }, true],
    [{}, true],
    [{ aircraftClass: 'ULTRALIGHT', ulKind: null }, true],
    [{ aircraftClass: 'ultralight ' }, true],
    [{ aircraftClass: 'ULTRALIGHT', ulKind: 'THREE_AXIS' }, false],
    [{ aircraftClass: 'GLIDER' }, false],
    [{ aircraftClass: 'SEP_LAND' }, false],
    [{ aircraftClass: 'HELICOPTER' }, false],
  ])('%o → %s', (ac, want) => {
    expect(needsClassification(ac)).toBe(want);
  });
});

describe('normalizeAircraftClass', () => {
  it('trims and upper-cases', () => {
    expect(normalizeAircraftClass(' glider ')).toBe('GLIDER');
    expect(normalizeAircraftClass(null)).toBe('');
  });
});
