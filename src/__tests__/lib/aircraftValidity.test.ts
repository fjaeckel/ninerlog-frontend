import { describe, it, expect } from 'vitest';
import { coversDate, hasRegistration, hasValidity, resolveAircraft } from '../../lib/aircraftValidity';
import type { Aircraft } from '../../hooks/useAircraft';

const ac = (over: Partial<Aircraft>): Aircraft => ({
  id: 'x', userId: 'u', registration: 'N123AB', type: 'C172', make: 'Cessna', model: '172',
  isComplex: false, isHighPerformance: false, isTailwheel: false, isActive: true,
  createdAt: '', updatedAt: '', ...over,
} as Aircraft);

describe('aircraftValidity', () => {
  const cessna = ac({ id: 'c172', type: 'C172', validTo: '2019-12-31' });
  const piper = ac({ id: 'pa16', type: 'PA16', validFrom: '2020-01-01' });
  const fleet = [cessna, piper, ac({ id: 'other', registration: 'D-EFGH' })];

  it('treats null bounds as open and both bounds as inclusive', () => {
    expect(coversDate({}, '1950-01-01')).toBe(true);
    expect(coversDate(cessna, '2019-12-31')).toBe(true);
    expect(coversDate(cessna, '2020-01-01')).toBe(false);
    expect(coversDate(piper, '2020-01-01')).toBe(true);
    expect(coversDate(piper, '2019-12-31')).toBe(false);
  });

  it('resolves a reused registration by date, case-insensitively', () => {
    expect(resolveAircraft(fleet, 'n123ab', '2015-06-01')?.id).toBe('c172');
    expect(resolveAircraft(fleet, ' N123AB ', '2024-06-01')?.id).toBe('pa16');
    expect(resolveAircraft(fleet, 'D-EFGH', '2024-06-01')?.id).toBe('other');
    expect(resolveAircraft(fleet, 'D-XXXX', '2024-06-01')).toBeUndefined();
    expect(resolveAircraft(undefined, 'N123AB', '2024-06-01')).toBeUndefined();
  });

  it('resolves nothing in a gap between two periods', () => {
    const gapped = [ac({ id: 'a', validTo: '2010-12-31' }), ac({ id: 'b', validFrom: '2015-01-01' })];
    expect(resolveAircraft(gapped, 'N123AB', '2012-01-01')).toBeUndefined();
    expect(hasRegistration(gapped, 'n123ab')).toBe(true);
    expect(hasRegistration(gapped, 'D-XXXX')).toBe(false);
  });

  it('reports whether a period is set', () => {
    expect(hasValidity({})).toBe(false);
    expect(hasValidity({ validFrom: null, validTo: null })).toBe(false);
    expect(hasValidity({ validTo: '2019-12-31' })).toBe(true);
  });
});
