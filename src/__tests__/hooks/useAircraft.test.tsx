import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAircraft } from '../../hooks/useAircraft';

const GET = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: { GET: (...args: unknown[]) => GET(...args) },
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

/** A page of aircraft named reg-<n>, as the API would return it. */
const page = (registrations: string[], pageNum: number, pageSize: number, total: number) => ({
  data: registrations.map((registration) => ({ registration })),
  pagination: {
    page: pageNum,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  },
});

const regsFor = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => `D-E${String(from + i).padStart(3, '0')}`);

describe('useAircraft', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the whole fleet when it fits in one page', async () => {
    GET.mockResolvedValue({ data: page(regsFor(0, 3), 1, 500, 3), error: undefined });

    const { result } = renderHook(() => useAircraft(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(GET).toHaveBeenCalledTimes(1);
  });

  it('pages through a fleet larger than one page', async () => {
    // ninerlog-api#187: a single request stopped at the page cap, so aircraft
    // beyond it were unreachable from the fleet list and the flight form.
    const total = 1100;
    GET.mockImplementation((_path: string, opts: { params: { query: { page: number } } }) => {
      const p = opts.params.query.page;
      const start = (p - 1) * 500;
      const count = Math.min(500, total - start);
      return Promise.resolve({ data: page(regsFor(start, count), p, 500, total), error: undefined });
    });

    const { result } = renderHook(() => useAircraft(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.data).toHaveLength(total));
    expect(GET).toHaveBeenCalledTimes(3);

    const returned = result.current.data!.map((a) => a.registration);
    expect(new Set(returned).size).toBe(total);
    expect(returned[0]).toBe('D-E000');
    expect(returned[total - 1]).toBe(`D-E${total - 1}`);
  });

  it('stops requesting once the last page is reached', async () => {
    GET.mockResolvedValue({ data: page(regsFor(0, 10), 1, 500, 10), error: undefined });

    const { result } = renderHook(() => useAircraft(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledTimes(1);
  });

  it('stops rather than looping when the response carries no pagination', async () => {
    GET.mockResolvedValue({ data: { data: [{ registration: 'D-EABC' }] }, error: undefined });

    const { result } = renderHook(() => useAircraft(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(GET).toHaveBeenCalledTimes(1);
  });

  it('surfaces an error from any page rather than returning a partial fleet', async () => {
    GET.mockImplementation((_path: string, opts: { params: { query: { page: number } } }) =>
      opts.params.query.page === 1
        ? Promise.resolve({ data: page(regsFor(0, 500), 1, 500, 900), error: undefined })
        : Promise.resolve({ data: undefined, error: { message: 'boom' } }),
    );

    const { result } = renderHook(() => useAircraft(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
