import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { flushQuickLogQueue, useRecordFlightSessionEvent } from '../../hooks/useFlightSession';
import { enqueueQuickLogEvent, loadQuickLogQueue } from '../../lib/quickLogQueue';

const POST = vi.fn();
const PUT = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    POST: (...args: unknown[]) => POST(...args),
    PUT: (...args: unknown[]) => PUT(...args),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children,
  );

describe('quick-log offline queue and launch method', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('L1: an offline landing queues the launch method beside the event', async () => {
    POST.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useRecordFlightSessionEvent(), { wrapper });
    await act(() => result.current.mutateAsync({ type: 'landing', launchMethod: 'winch' }));
    expect(POST.mock.calls[0][1].body).not.toHaveProperty('launchMethod');
    expect(loadQuickLogQueue()).toEqual([expect.objectContaining({ type: 'landing', launchMethod: 'winch' })]);
  });

  it('L1: flushing the completing landing sets the launch method on the flight', async () => {
    enqueueQuickLogEvent({ type: 'takeoff', occurredAt: '2026-08-08T10:00:00Z' });
    enqueueQuickLogEvent({ type: 'landing', occurredAt: '2026-08-08T10:08:00Z', launchMethod: 'winch' });
    POST.mockResolvedValueOnce({ data: { id: 's1', status: 'open' } });
    POST.mockResolvedValueOnce({ data: { id: 's1', status: 'completed', flightId: 'f9' } });
    PUT.mockResolvedValue({ data: { id: 'f9' } });

    expect(await flushQuickLogQueue()).toBe(2);
    expect(POST.mock.calls[1][1].body).toEqual({ type: 'landing', occurredAt: '2026-08-08T10:08:00Z' });
    expect(PUT).toHaveBeenCalledWith('/flights/{flightId}', {
      params: { path: { flightId: 'f9' } },
      body: { launchMethod: 'winch' },
    });
    expect(loadQuickLogQueue()).toEqual([]);
  });

  it('a flushed tap without a launch method leaves the flight alone', async () => {
    enqueueQuickLogEvent({ type: 'onblock' });
    POST.mockResolvedValue({ data: { id: 's1', status: 'completed', flightId: 'f9' } });
    await flushQuickLogQueue();
    expect(PUT).not.toHaveBeenCalled();
  });
});
