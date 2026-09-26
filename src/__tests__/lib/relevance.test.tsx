import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { DISCIPLINES, resolveDisciplines } from '../../hooks/usePilotProfile';
import { defineFeatures, FEATURES, type Aircraft, type FeatureDef, type FeatureId } from '../../lib/relevance/registry';
import { resolveRelevance } from '../../lib/relevance/resolve';
import { useRelevance } from '../../lib/relevance/useRelevance';
import { gliderProfile } from '../../test/pilotProfile';

const GET = vi.fn();
vi.mock('../../api/client', () => ({ apiClient: { GET: (...args: unknown[]) => GET(...args) } }));

const TEST_FEATURES: FeatureDef[] = [
  { id: 'test.everyone', kind: 'field', serves: 'all' },
  {
    id: 'test.launchMethod',
    kind: 'field',
    serves: ['SAILPLANE'],
    aircraftMatch: (ac) => ac.aircraftClass === 'GLIDER',
    hasData: (ctx) => ctx.record?.launchMethod != null,
  },
  {
    id: 'test.ifr',
    kind: 'section',
    serves: ['IFR'],
    hasData: (ctx) => Number(ctx.record?.ifrTime ?? 0) > 0,
  },
  {
    id: 'test.aeroplaneFlag',
    kind: 'field',
    serves: ['AEROPLANE'],
    aircraftMatch: (ac) => ac.aircraftClass === 'SEP_LAND',
  },
];

vi.mock('../../lib/relevance/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/relevance/registry')>();
  return {
    ...actual,
    getFeature: (id: string) => TEST_FEATURES.find((f) => f.id === id),
  };
});

const feature = (id: string) => TEST_FEATURES.find((f) => f.id === id);
const glider = { aircraftClass: 'GLIDER' } as Aircraft;
const c172 = { aircraftClass: 'SEP_LAND' } as Aircraft;
const ready = resolveDisciplines(gliderProfile(), false);

describe('registry', () => {
  it('declares the flight form features', () => {
    expect(FEATURES.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'flight.launchMethod', 'flight.ifrSection', 'flight.multiCrew', 'flight.spic', 'flight.examiner',
        'flight.route', 'flight.outlanding', 'flight.towFlight', 'flight.releaseHeight', 'flight.launches',
        'flight.blockTimes',
      ]),
    );
  });

  it('declares every entry against known disciplines', () => {
    for (const f of FEATURES as readonly FeatureDef[]) {
      if (f.serves === 'all') continue;
      expect(f.serves.length).toBeGreaterThan(0);
      for (const d of f.serves) expect(DISCIPLINES).toContain(d);
    }
  });

  it('rejects a duplicate id', () => {
    expect(() =>
      defineFeatures([
        { id: 'a', kind: 'field', serves: 'all' },
        { id: 'a', kind: 'nav', serves: 'all' },
      ]),
    ).toThrow(/duplicate/);
  });
});

describe('resolveRelevance truth table', () => {
  it('shows a feature that serves all', () => {
    expect(resolveRelevance(feature('test.everyone'), ready)).toMatchObject({ visible: true, folded: false });
  });

  it('shows an unknown feature id', () => {
    expect(resolveRelevance(undefined, ready)).toMatchObject({ visible: true, cause: { kind: 'unknownFeature' } });
  });

  it('shows a feature serving an active discipline, citing the evidence', () => {
    expect(resolveRelevance(feature('test.launchMethod'), ready)).toEqual({
      visible: true,
      folded: false,
      cause: { kind: 'evidence', discipline: 'SAILPLANE', ref: 'SPL 12345' },
    });
  });

  it('folds a feature serving no active discipline', () => {
    expect(resolveRelevance(feature('test.ifr'), ready)).toEqual({
      visible: false,
      folded: true,
      cause: { kind: 'folded', disciplines: ['IFR'] },
    });
  });

  it('shows a folded feature when the record holds data (data always wins)', () => {
    const r = resolveRelevance(feature('test.ifr'), ready, { record: { ifrTime: 42 } });
    expect(r).toMatchObject({ visible: true, cause: { kind: 'hasData' } });
  });

  it('data wins over an aircraft that does not match', () => {
    const r = resolveRelevance(feature('test.launchMethod'), ready, { aircraft: c172, record: { launchMethod: 'WINCH' } });
    expect(r).toMatchObject({ visible: true, cause: { kind: 'hasData' } });
  });

  it('lets a matching aircraft show a feature the pilot scope would fold', () => {
    const r = resolveRelevance(feature('test.aeroplaneFlag'), ready, { aircraft: c172 });
    expect(r).toMatchObject({ visible: true, cause: { kind: 'aircraft', match: true } });
  });

  it('lets a non-matching aircraft fold a feature the pilot scope would show', () => {
    const r = resolveRelevance(feature('test.launchMethod'), ready, { aircraft: c172 });
    expect(r).toMatchObject({ visible: false, folded: true, cause: { kind: 'aircraft', match: false } });
  });

  it('ignores the aircraft for a feature without aircraftMatch', () => {
    expect(resolveRelevance(feature('test.ifr'), ready, { aircraft: glider })).toMatchObject({ folded: true });
  });

  it('shows everything in everything mode', () => {
    const everything = resolveDisciplines(gliderProfile({ mode: 'everything' }), false);
    expect(resolveRelevance(feature('test.ifr'), everything)).toMatchObject({ visible: true, cause: { kind: 'everything' } });
    expect(resolveRelevance(feature('test.launchMethod'), everything, { aircraft: c172 })).toMatchObject({ visible: true });
  });

  it('shows everything while the profile is loading', () => {
    const loading = resolveDisciplines(undefined, true);
    expect(resolveRelevance(feature('test.ifr'), loading)).toMatchObject({ visible: true, cause: { kind: 'failOpen' } });
    expect(resolveRelevance(feature('test.launchMethod'), loading, { aircraft: c172 })).toMatchObject({ visible: true });
  });

  it('shows a feature serving an unknown discipline', () => {
    const def: FeatureDef = { id: 'x', kind: 'field', serves: ['BALLOON' as never] };
    expect(resolveRelevance(def, ready)).toMatchObject({ visible: true });
  });

  it('names intent on and training goals as the cause', () => {
    const p = gliderProfile();
    p.disciplines[6] = { ...p.disciplines[6], status: 'active', intent: 'on' };
    p.disciplines[0] = { ...p.disciplines[0], status: 'training', intent: 'goal' };
    const d = resolveDisciplines(p, false);
    expect(resolveRelevance(feature('test.ifr'), d).cause).toEqual({ kind: 'intentOn', discipline: 'IFR' });
    expect(resolveRelevance(feature('test.aeroplaneFlag'), d).cause).toEqual({ kind: 'goal', discipline: 'AEROPLANE' });
  });
});

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

describe('useRelevance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is visible while loading and folds once the profile arrives', async () => {
    let resolve: (v: unknown) => void = () => {};
    GET.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useRelevance('test.ifr' as FeatureId), { wrapper: wrap(makeClient()) });
    expect(result.current.visible).toBe(true);

    resolve({ data: gliderProfile(), error: undefined });
    await waitFor(() => expect(result.current.folded).toBe(true));
    expect(result.current.reason).toBe('Folded because none of its toolkits is on: IFR');
  });

  it('explains a shown feature from the evidence', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    const { result } = renderHook(() => useRelevance('test.launchMethod' as FeatureId), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.reason).toBe('Shown because: SPL 12345'));
    expect(result.current.visible).toBe(true);
  });

  it('explains data and aircraft decisions', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    const qc = makeClient();
    const withData = renderHook(() => useRelevance('test.ifr' as FeatureId, { record: { ifrTime: 5 } }), { wrapper: wrap(qc) });
    await waitFor(() => expect(withData.result.current.reason).toBe('Shown because it already holds data'));
    const byAircraft = renderHook(() => useRelevance('test.aeroplaneFlag' as FeatureId, { aircraft: c172 }), { wrapper: wrap(qc) });
    await waitFor(() => expect(byAircraft.result.current.reason).toBe('Shown because it matches the selected aircraft'));
  });
});
