import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateFlightBatch } from '../../hooks/useFlightBatch';
import { useRecordFlightSessionEvent } from '../../hooks/useFlightSession';
import { FLIGHT_DEPENDENT_QUERY_KEYS } from '../../hooks/invalidation';

const POST = vi.fn();
vi.mock('../../api/client', () => ({ apiClient: { POST: (...args: unknown[]) => POST(...args) } }));

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { spy, wrapper };
};

const invalidatedKeys = (spy: ReturnType<typeof setup>['spy']) =>
  spy.mock.calls.map(([arg]) => (arg as { queryKey: unknown[] }).queryKey);

describe('useCreateFlightBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('L1: posts template and legs to /flights/batch and invalidates every flight-dependent query', async () => {
    POST.mockResolvedValue({ data: { flights: [{ id: 'f1' }, { id: 'f2' }] }, error: undefined });
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateFlightBatch(), { wrapper });
    const body = {
      template: { date: '2026-08-08', isSimulator: false, aircraftType: 'AS21', ifrTime: 0, isOutlanding: false, isTowFlight: false },
      legs: [{ departureTime: '10:00:00', arrivalTime: '10:08:00' }],
    };
    let out: unknown;
    await act(async () => {
      out = await result.current.mutateAsync(body);
    });
    expect(POST).toHaveBeenCalledWith('/flights/batch', { body });
    expect(out).toEqual({ flights: [{ id: 'f1' }, { id: 'f2' }] });
    expect(invalidatedKeys(spy)).toEqual(FLIGHT_DEPENDENT_QUERY_KEYS.map((k) => [...k]));
  });

  it('rejects with the API error and invalidates nothing', async () => {
    POST.mockResolvedValue({ data: undefined, error: { error: 'Leg 2: bad' } });
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateFlightBatch(), { wrapper });
    await expect(
      act(() => result.current.mutateAsync({ template: {} as never, legs: [] })),
    ).rejects.toEqual({ error: 'Leg 2: bad' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useRecordFlightSessionEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('L1: a landing that completes a take-off session refreshes flight-dependent queries', async () => {
    POST.mockResolvedValue({ data: { id: 's1', status: 'completed', flightId: 'f1' }, error: undefined });
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useRecordFlightSessionEvent(), { wrapper });
    await act(() => result.current.mutateAsync({ type: 'landing' }));
    const keys = invalidatedKeys(spy);
    expect(keys).toContainEqual(['flightSession']);
    expect(keys).toContainEqual(['currency']);
    expect(keys).toContainEqual(['statistics']);
  });

  it('an open session refreshes only the session', async () => {
    POST.mockResolvedValue({ data: { id: 's1', status: 'open' }, error: undefined });
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useRecordFlightSessionEvent(), { wrapper });
    await act(() => result.current.mutateAsync({ type: 'takeoff' }));
    expect(invalidatedKeys(spy)).toEqual([['flightSession']]);
  });
});
