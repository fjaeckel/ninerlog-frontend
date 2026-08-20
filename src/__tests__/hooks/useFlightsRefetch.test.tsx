import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import React from 'react';
import { useFlights, FLIGHTS_STALE_TIME_MS } from '../../hooks/useFlights';
import { invalidateFlightDependentQueries } from '../../hooks/invalidation';

// The real query-client defaults from src/main.tsx.
const APP_QUERY_DEFAULTS = {
  staleTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

let calls = 0;

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(async () => {
      calls++;
      return { data: { flights: [], total: 0, page: 1, pageSize: 20 }, error: undefined };
    }),
  },
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: APP_QUERY_DEFAULTS } });
const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

async function refocus() {
  act(() => { focusManager.setFocused(false); });
  await act(async () => { focusManager.setFocused(true); });
}

describe('useFlights refetch behaviour', () => {
  beforeEach(() => {
    calls = 0;
    focusManager.setFocused(true);
  });

  it('does not re-run a search every time the window regains focus', async () => {
    const qc = makeClient();
    const { result } = renderHook(() => useFlights({ q: 'from:EDDF' }), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toBe(1);

    // The user alt-tabs away and back three times while reading the results.
    for (let i = 0; i < 3; i++) await refocus();
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(calls).toBe(1);
  });

  it('does not re-run the search when the page remounts within the window', async () => {
    // Standing in for: open a flight's detail page, then press back.
    const qc = makeClient();
    const first = renderHook(() => useFlights({ q: 'from:EDDF' }), { wrapper: wrap(qc) });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useFlights({ q: 'from:EDDF' }), { wrapper: wrap(qc) });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(calls).toBe(1);
  });

  it('still refetches once the data has actually gone stale', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const qc = makeClient();
      const { result } = renderHook(() => useFlights({ q: 'from:EDDF' }), { wrapper: wrap(qc) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(calls).toBe(1);

      await act(async () => { vi.advanceTimersByTime(FLIGHTS_STALE_TIME_MS + 1_000); });
      await refocus();
      await waitFor(() => expect(calls).toBe(2));
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshes immediately when a mutation invalidates flights', async () => {
    // staleTime must not delay the user's own edits — invalidation overrides it.
    const qc = makeClient();
    const { result } = renderHook(() => useFlights({ q: 'from:EDDF' }), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toBe(1);

    await act(async () => { invalidateFlightDependentQueries(qc); });
    await waitFor(() => expect(calls).toBe(2));
  });

  it('fetches when the search term changes, rather than serving a cached page', async () => {
    const qc = makeClient();
    const { rerender, result } = renderHook(({ q }: { q: string }) => useFlights({ q }), {
      wrapper: wrap(qc),
      initialProps: { q: 'from:EDDF' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ q: 'from:EDDM' });
    await waitFor(() => expect(calls).toBe(2));
  });
});
