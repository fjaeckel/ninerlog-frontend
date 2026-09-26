import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { trainingProgressQueryKey, useTrainingProgress } from '../../hooks/useTrainingProgress';
import { FLIGHT_DEPENDENT_QUERY_KEYS, invalidateFlightDependentQueries } from '../../hooks/invalidation';
import { useCreateLicense, useDeleteLicense } from '../../hooks/useLicenses';
import { useCreateClassRating } from '../../hooks/useClassRatings';
import { useUpdatePilotProfile } from '../../hooks/usePilotProfile';
import { jonasSpl } from './fixtures';

const GET = vi.fn();
const POST = vi.fn();
const PATCH = vi.fn();
const DELETE = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
};

const invalidated = (spy: ReturnType<typeof setup>['spy']) =>
  spy.mock.calls.map(([arg]) => JSON.stringify((arg as { queryKey: unknown[] }).queryKey));

describe('useTrainingProgress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('J1: fetches the programmes in training without a programme parameter', async () => {
    GET.mockResolvedValue({ data: { programmes: [jonasSpl()] }, error: undefined });
    const { wrapper } = setup();
    const { result } = renderHook(() => useTrainingProgress(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/training/progress', { params: { query: {} } });
    expect(result.current.data?.programmes[0].id).toBe('SPL');
  });

  it('passes explicit programmes as the repeatable programme parameter', async () => {
    GET.mockResolvedValue({ data: { programmes: [] }, error: undefined });
    const { wrapper } = setup();
    const { result } = renderHook(() => useTrainingProgress(['UL_WEIGHT_SHIFT', 'SPL']), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/training/progress', { params: { query: { programme: ['UL_WEIGHT_SHIFT', 'SPL'] } } });
  });

  it('keys queries under training-progress, order-independent', () => {
    expect(trainingProgressQueryKey()).toEqual(['training-progress', []]);
    expect(trainingProgressQueryKey(['UL_WEIGHT_SHIFT', 'SPL'])).toEqual(trainingProgressQueryKey(['SPL', 'UL_WEIGHT_SHIFT']));
  });

  it('surfaces an API error', async () => {
    GET.mockResolvedValue({ data: undefined, error: { error: 'bad programme' } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useTrainingProgress(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('training progress invalidation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is flight-dependent', () => {
    expect(FLIGHT_DEPENDENT_QUERY_KEYS).toEqual(expect.arrayContaining([['training-progress']]));
    const { qc, spy } = setup();
    invalidateFlightDependentQueries(qc);
    expect(invalidated(spy)).toContain('["training-progress"]');
  });

  it('J3: adding or deleting a licence refreshes training progress', async () => {
    POST.mockResolvedValue({ data: { id: 'l1', licenseType: 'SPL' }, error: undefined });
    DELETE.mockResolvedValue({ error: undefined });
    const { spy, wrapper } = setup();
    const create = renderHook(() => useCreateLicense(), { wrapper });
    await act(async () => {
      await create.result.current.mutateAsync({ licenseType: 'SPL' } as never);
    });
    expect(invalidated(spy)).toContain('["training-progress"]');
    spy.mockClear();
    const del = renderHook(() => useDeleteLicense(), { wrapper });
    await act(async () => {
      await del.result.current.mutateAsync('l1' as never);
    });
    expect(invalidated(spy)).toContain('["training-progress"]');
  });

  it('adding a rating refreshes training progress', async () => {
    POST.mockResolvedValue({ data: { id: 'cr1' }, error: undefined });
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateClassRating(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ licenseId: 'l1', data: { classType: 'GLIDER' } as never });
    });
    expect(invalidated(spy)).toContain('["training-progress"]');
  });

  it('setting a toolkit to "Training toward" refreshes training progress', async () => {
    PATCH.mockResolvedValue({ data: { mode: 'adaptive', disciplines: [], pendingAcknowledgement: [] }, error: undefined });
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useUpdatePilotProfile(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ intents: { SAILPLANE: 'goal' } });
    });
    expect(invalidated(spy)).toContain('["training-progress"]');
  });
});
