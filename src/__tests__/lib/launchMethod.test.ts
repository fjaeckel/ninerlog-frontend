import { describe, it, expect } from 'vitest';
import { isSailplane, showsLaunchMethod } from '../../lib/launchMethod';

describe('isSailplane', () => {
  it.each([
    ['L3: GLIDER', { aircraftClass: 'GLIDER' }, true],
    ['GLIDER, lower case and padded', { aircraftClass: ' glider ' }, true],
    ['UL SAILPLANE', { aircraftClass: 'ULTRALIGHT', ulKind: 'SAILPLANE' }, true],
    ['K1: TMG', { aircraftClass: 'TMG' }, false],
    ['UL motorglider', { aircraftClass: 'ULTRALIGHT', ulKind: 'THREE_AXIS_MOTORGLIDER' }, false],
    ['M3: UL three-axis', { aircraftClass: 'ULTRALIGHT', ulKind: 'THREE_AXIS' }, false],
    ['UL without kind', { aircraftClass: 'ULTRALIGHT', ulKind: null }, false],
    ['A1: SEP', { aircraftClass: 'SEP_LAND' }, false],
    ['custom class containing "glider"', { aircraftClass: 'MOTORGLIDER' }, false],
    ['no class', { aircraftClass: null }, false],
  ])('%s → %s', (_name, ac, want) => {
    expect(isSailplane(ac)).toBe(want);
  });

  it('is false for an unknown aircraft', () => {
    expect(isSailplane(undefined)).toBe(false);
  });
});

describe('showsLaunchMethod', () => {
  it('shows for a sailplane without a stored method', () => {
    expect(showsLaunchMethod({ aircraftClass: 'GLIDER' })).toBe(true);
  });

  it('hides for a TMG without a stored method', () => {
    expect(showsLaunchMethod({ aircraftClass: 'TMG' }, null)).toBe(false);
  });

  it('shows a stored method whatever the aircraft', () => {
    expect(showsLaunchMethod({ aircraftClass: 'SEP_LAND' }, 'winch')).toBe(true);
    expect(showsLaunchMethod(undefined, 'aerotow')).toBe(true);
  });
});
