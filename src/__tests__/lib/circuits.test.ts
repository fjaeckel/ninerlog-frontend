import { describe, it, expect } from 'vitest';
import { addMinutes, legMinutes, legProblem, nextLeg, parseLegError, totalMinutes } from '../../lib/circuits';
import { isAirborneSession, leadsWithAirborne, nextEventFor } from '../../lib/quickLogFlow';
import type { Aircraft } from '../../lib/relevance';

describe('circuits', () => {
  it('adds minutes across midnight', () => {
    expect(addMinutes('10:08', 5)).toBe('10:13');
    expect(addMinutes('23:58', 5)).toBe('00:03');
    expect(addMinutes('bad', 5)).toBe('');
  });

  it('L1: six 8-minute legs total 48 minutes', () => {
    const legs = Array.from({ length: 6 }, (_, i) => ({ takeoff: addMinutes('10:00', i * 13), landing: addMinutes('10:08', i * 13) }));
    expect(legs.map(legMinutes)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(totalMinutes(legs)).toBe(48);
  });

  it('offers the next take-off five minutes after the last landing', () => {
    expect(nextLeg([{ takeoff: '10:00', landing: '10:08' }])).toEqual({ takeoff: '10:13', landing: '' });
    expect(nextLeg([{ takeoff: '10:00', landing: '' }])).toEqual({ takeoff: '10:05', landing: '' });
    expect(nextLeg([{ takeoff: '', landing: '' }])).toEqual({ takeoff: '', landing: '' });
  });

  it.each([
    [{ takeoff: '', landing: '10:08' }, 'missing'],
    [{ takeoff: '10:00', landing: '1o:08' }, 'invalid'],
    [{ takeoff: '10:00', landing: '10:00' }, 'zero'],
    [{ takeoff: '23:55', landing: '00:03' }, null],
  ])('leg problem %o → %s', (leg, problem) => {
    expect(legProblem(leg)).toBe(problem);
  });

  it('parses a zero-based leg error', () => {
    expect(parseLegError('Leg 2: arrivalTime is required')).toEqual({ index: 2, message: 'arrivalTime is required' });
    expect(parseLegError('legs must hold between 1 and 50 entries')).toBeNull();
  });
});

describe('quick log flow', () => {
  const ac = (aircraftClass: string) => ({ aircraftClass }) as Aircraft;
  const session = (over: Record<string, unknown>) =>
    ({ id: 's', userId: 'u', status: 'open', createdAt: '', updatedAt: '', ...over }) as Parameters<typeof nextEventFor>[0];

  it.each([
    ['GLIDER', true], ['TMG', true], ['ULTRALIGHT', true], ['SEP_LAND', false], ['MEP_LAND', false],
  ])('%s leads with airborne times: %s', (cls, expected) => {
    expect(leadsWithAirborne(ac(cls))).toBe(expected);
  });

  it('A2: no aircraft keeps block times first', () => {
    expect(leadsWithAirborne(undefined)).toBe(false);
    expect(nextEventFor(null, false)).toBe('offblock');
  });

  it('L1: take-off first, then landing', () => {
    expect(nextEventFor(null, true)).toBe('takeoff');
    const airborne = session({ takeoffAt: '2026-08-08T10:00:00Z' });
    expect(isAirborneSession(airborne)).toBe(true);
    expect(nextEventFor(airborne, true)).toBe('landing');
    expect(nextEventFor(airborne, false)).toBe('landing');
  });

  it('a block-time session walks the full sequence', () => {
    expect(nextEventFor(session({ offBlockAt: 'x' }), true)).toBe('takeoff');
    expect(nextEventFor(session({ offBlockAt: 'x', takeoffAt: 'y' }), true)).toBe('landing');
    expect(nextEventFor(session({ offBlockAt: 'x', takeoffAt: 'y', landingAt: 'z' }), true)).toBe('onblock');
    expect(isAirborneSession(session({ offBlockAt: 'x', takeoffAt: 'y' }))).toBe(false);
  });
});
