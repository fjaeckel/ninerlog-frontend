import { describe, it, expect } from 'vitest';
import { resolveDisciplines } from '../../hooks/usePilotProfile';
import { getFeature, resolveRelevance, type Aircraft, type RelevanceCtx } from '../../lib/relevance';
import { profileWith } from '../../test/pilotProfile';

const ac = (aircraftClass: string, over: Partial<Aircraft> = {}) => ({ aircraftClass, ...over }) as Aircraft;
const ASK21 = ac('GLIDER');
const SF25 = ac('TMG');
const C42 = ac('ULTRALIGHT', { ulKind: 'THREE_AXIS' });
const TRIKE = ac('ULTRALIGHT', { ulKind: 'WEIGHT_SHIFT' });
const DR400 = ac('SEP_LAND');
const A320 = ac('MEP_LAND', { isMultiPilot: true });

const lena = resolveDisciplines(profileWith({ SAILPLANE: 'active' }), false);
const jonas = resolveDisciplines(profileWith({ SAILPLANE: 'training' }), false);
const karl = resolveDisciplines(profileWith({ TMG: 'active', SAILPLANE: 'dormant' }), false);
const petra = resolveDisciplines(profileWith({ SAILPLANE: 'active', AEROPLANE: 'active', INSTRUCTOR: 'active' }), false);
const sabine = resolveDisciplines(profileWith({ ULTRALIGHT: 'active' }), false);
const mark = resolveDisciplines(
  profileWith({ AEROPLANE: 'active', IFR: 'active', MULTI_CREW: 'active', SIMULATOR: 'active' }),
  false,
);
const loading = resolveDisciplines(undefined, true);

const visible = (id: string, d: typeof lena, ctx: RelevanceCtx = {}) => resolveRelevance(getFeature(id), d, ctx).visible;

describe('flight form features', () => {
  it('L3: launch method and launches serve a glider, block times fold', () => {
    expect(visible('flight.launchMethod', lena, { aircraft: ASK21 })).toBe(true);
    expect(visible('flight.launches', lena, { aircraft: ASK21 })).toBe(true);
    expect(visible('flight.blockTimes', lena, { aircraft: ASK21 })).toBe(false);
    expect(visible('flight.ifrSection', lena, { aircraft: ASK21 })).toBe(false);
    expect(visible('flight.multiCrew', lena, { aircraft: ASK21 })).toBe(false);
    expect(visible('flight.route', lena, { aircraft: ASK21 })).toBe(false);
  });

  it('release height needs a winch or aerotow launch', () => {
    expect(visible('flight.releaseHeight', lena, { aircraft: ASK21, record: { launchMethod: 'winch' } })).toBe(true);
    expect(visible('flight.releaseHeight', lena, { aircraft: ASK21, record: { launchMethod: 'aerotow' } })).toBe(true);
    expect(visible('flight.releaseHeight', lena, { aircraft: ASK21, record: { launchMethod: 'self-launch' } })).toBe(false);
    expect(visible('flight.releaseHeight', lena, { aircraft: ASK21 })).toBe(false);
    expect(visible('flight.releaseHeight', lena, { aircraft: ASK21, record: { releaseHeightM: 450 } })).toBe(true);
  });

  it('K1: a TMG gets no launch method, take-off/landing lead, outlanding offered', () => {
    expect(visible('flight.launchMethod', karl, { aircraft: SF25 })).toBe(false);
    expect(visible('flight.launchMethod', karl)).toBe(false);
    expect(visible('flight.blockTimes', karl, { aircraft: SF25 })).toBe(false);
    expect(visible('flight.outlanding', karl, { aircraft: SF25 })).toBe(true);
    expect(visible('flight.route', karl, { aircraft: SF25 })).toBe(true);
  });

  it('S3: a trike folds IFR, multi-crew, route and block times', () => {
    for (const id of ['flight.ifrSection', 'flight.multiCrew', 'flight.route', 'flight.blockTimes', 'flight.launchMethod']) {
      expect(visible(id, sabine, { aircraft: TRIKE })).toBe(false);
    }
    expect(visible('flight.outlanding', sabine, { aircraft: TRIKE })).toBe(true);
  });

  it('M1: a three-axis UL leads with take-off/landing', () => {
    expect(visible('flight.blockTimes', resolveDisciplines(profileWith({ ULTRALIGHT: 'active', AEROPLANE: 'dormant' }), false), { aircraft: C42 })).toBe(false);
  });

  it('A1: the A320 keeps block times, IFR and multi-crew and folds every glider field', () => {
    expect(visible('flight.blockTimes', mark, { aircraft: A320 })).toBe(true);
    expect(visible('flight.ifrSection', mark, { aircraft: A320 })).toBe(true);
    expect(visible('flight.multiCrew', mark, { aircraft: A320 })).toBe(true);
    expect(visible('flight.route', mark, { aircraft: A320 })).toBe(true);
    for (const id of ['flight.launchMethod', 'flight.launches', 'flight.releaseHeight', 'flight.outlanding', 'flight.towFlight', 'flight.spic']) {
      expect(visible(id, mark, { aircraft: A320 })).toBe(false);
    }
  });

  it('P1: the DR400 offers a tow flight to a glider pilot, the ASG 29 does not', () => {
    expect(visible('flight.towFlight', petra, { aircraft: DR400 })).toBe(true);
    expect(visible('flight.towFlight', petra, { aircraft: ASK21 })).toBe(false);
    expect(visible('flight.towFlight', petra)).toBe(true);
    expect(visible('flight.towFlight', lena)).toBe(false);
    expect(visible('flight.blockTimes', petra, { aircraft: DR400 })).toBe(true);
    expect(visible('flight.launchMethod', petra, { aircraft: DR400 })).toBe(false);
    expect(visible('flight.examiner', petra)).toBe(true);
  });

  it('Jonas (P2 job 3): supervised solo serves a discipline in training only', () => {
    expect(visible('flight.spic', jonas, { aircraft: ASK21 })).toBe(true);
    expect(visible('flight.spic', lena, { aircraft: ASK21 })).toBe(false);
    expect(visible('flight.spic', lena, { record: { spicTime: 20 } })).toBe(true);
  });

  it('invariant 2: data always wins', () => {
    expect(visible('flight.ifrSection', lena, { aircraft: ASK21, record: { ifrTime: 30 } })).toBe(true);
    expect(visible('flight.ifrSection', lena, { record: { approaches: [{ type: 'ILS' }] } })).toBe(true);
    expect(visible('flight.multiCrew', lena, { record: { reliefTime: 30 } })).toBe(true);
    expect(visible('flight.blockTimes', lena, { aircraft: ASK21, record: { offBlockTime: '10:00' } })).toBe(true);
    expect(visible('flight.towFlight', mark, { record: { isTowFlight: true } })).toBe(true);
    expect(visible('flight.launches', mark, { record: { launchesOverride: true, launches: 6 } })).toBe(true);
  });

  it('invariant 3: fail open while the profile loads', () => {
    for (const id of ['flight.launchMethod', 'flight.ifrSection', 'flight.multiCrew', 'flight.towFlight', 'flight.spic', 'flight.blockTimes']) {
      expect(visible(id, loading, { aircraft: ASK21 })).toBe(true);
    }
  });
});
