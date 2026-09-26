import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  resolveDisciplines,
  useDisciplines,
  usePilotProfile,
  useUpdatePilotProfile,
} from '../../hooks/usePilotProfile';
import { gliderProfile } from '../../test/pilotProfile';

const GET = vi.fn();
const PATCH = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => GET(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
  },
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

describe('resolveDisciplines (fail open)', () => {
  it('reports every discipline active while loading', () => {
    const d = resolveDisciplines(gliderProfile(), true);
    expect(d.isReady).toBe(false);
    expect(d.status('IFR')).toBe('active');
    expect(d.isRelevant(['IFR'])).toBe(true);
  });

  it('reports every discipline active without a profile', () => {
    for (const profile of [null, undefined]) {
      const d = resolveDisciplines(profile, false);
      expect(d.status('MULTI_CREW')).toBe('active');
      expect(d.isRelevant(['MULTI_CREW'])).toBe(true);
      expect(d.evidence('MULTI_CREW')).toEqual([]);
    }
  });

  it('reports every discipline active for a profile with no disciplines', () => {
    const d = resolveDisciplines(gliderProfile({ disciplines: [] }), false);
    expect(d.status('IFR')).toBe('active');
    expect(d.isRelevant(['IFR'])).toBe(true);
  });

  it('reports an unknown discipline active', () => {
    const d = resolveDisciplines(gliderProfile(), false);
    expect(d.status('BALLOON')).toBe('active');
    expect(d.isRelevant(['BALLOON'])).toBe(true);
  });

  it('reports an unknown status as active', () => {
    const p = gliderProfile();
    (p.disciplines[6] as { status: string }).status = 'suspended';
    expect(resolveDisciplines(p, false).status('IFR')).toBe('active');
  });

  it('follows the profile once loaded', () => {
    const d = resolveDisciplines(gliderProfile(), false);
    expect(d.isReady).toBe(true);
    expect(d.status('SAILPLANE')).toBe('active');
    expect(d.status('IFR')).toBe('off');
    expect(d.isRelevant(['SAILPLANE'])).toBe(true);
    expect(d.isRelevant(['IFR', 'MULTI_CREW'])).toBe(false);
    expect(d.evidence('SAILPLANE')[0].ref).toBe('SPL 12345');
  });

  it('treats training as relevant and dormant as not', () => {
    const p = gliderProfile();
    p.disciplines[0].status = 'training';
    p.disciplines[1].status = 'dormant';
    const d = resolveDisciplines(p, false);
    expect(d.isRelevant(['AEROPLANE'])).toBe(true);
    expect(d.isRelevant(['TMG'])).toBe(false);
  });

  it('treats everything relevant in everything mode', () => {
    const d = resolveDisciplines(gliderProfile({ mode: 'everything' }), false);
    expect(d.mode).toBe('everything');
    expect(d.isRelevant(['IFR'])).toBe(true);
    expect(d.status('IFR')).toBe('off');
  });
});

describe('useDisciplines', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails open while the request is in flight', () => {
    GET.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDisciplines(), { wrapper: wrap(makeClient()) });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRelevant(['IFR'])).toBe(true);
  });

  it('fails open when the request errors', async () => {
    GET.mockResolvedValue({ data: undefined, error: { error: 'boom' } });
    const { result } = renderHook(() => useDisciplines(), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status('IFR')).toBe('active');
    expect(result.current.isRelevant(['IFR'])).toBe(true);
  });

  it('folds an off discipline once the profile has loaded', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    const { result } = renderHook(() => useDisciplines(), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(GET).toHaveBeenCalledWith('/users/me/pilot-profile');
    expect(result.current.isRelevant(['IFR'])).toBe(false);
    expect(result.current.isRelevant(['SAILPLANE'])).toBe(true);
  });
});

describe('useUpdatePilotProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('PATCHes the body and replaces the cached profile', async () => {
    const qc = makeClient();
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    const updated = gliderProfile({ mode: 'everything' });
    PATCH.mockResolvedValue({ data: updated, error: undefined });

    const { result } = renderHook(() => ({ q: usePilotProfile(), m: useUpdatePilotProfile() }), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.q.data).toBeDefined());

    await act(() => result.current.m.mutateAsync({ mode: 'everything' }));

    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { mode: 'everything' } });
    expect(qc.getQueryData(['pilot-profile'])).toEqual(updated);
  });
});
