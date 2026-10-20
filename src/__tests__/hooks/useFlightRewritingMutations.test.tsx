import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateContact, useDeleteContact, useCreateContact } from '../../hooks/useContacts';
import { useUpdateAircraft, useCreateAircraft } from '../../hooks/useAircraft';
import { FLIGHT_DEPENDENT_QUERY_KEYS } from '../../hooks/invalidation';

const PUT = vi.fn();
const PATCH = vi.fn();
const DELETE = vi.fn();
const POST = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    PUT: (...args: unknown[]) => PUT(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
    DELETE: (...args: unknown[]) => DELETE(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  const invalidatedKeys = () => spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
  return { wrapper, invalidatedKeys };
};

const expectFlightDependentInvalidated = (keys: string[]) => {
  for (const key of FLIGHT_DEPENDENT_QUERY_KEYS) {
    expect(keys).toContain(JSON.stringify(key));
  }
};

describe('contact and aircraft mutations that rewrite flights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('contact rename invalidates contacts and every flight-dependent query', async () => {
    PUT.mockResolvedValue({ data: { id: 'c1', name: 'New' }, error: undefined });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    await result.current.mutateAsync({ id: 'c1', data: { name: 'New' } });

    await waitFor(() => expect(invalidatedKeys()).toContain(JSON.stringify(['contacts'])));
    expectFlightDependentInvalidated(invalidatedKeys());
  });

  it('contact delete invalidates flight-dependent queries (crew links are cleared)', async () => {
    DELETE.mockResolvedValue({ error: undefined });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    await result.current.mutateAsync('c1');

    expectFlightDependentInvalidated(invalidatedKeys());
  });

  it('aircraft update invalidates aircraft and every flight-dependent query', async () => {
    PATCH.mockResolvedValue({ data: { id: 'a1', registration: 'D-EABC' }, error: undefined });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useUpdateAircraft(), { wrapper });

    await result.current.mutateAsync({ id: 'a1', data: { registration: 'D-EABC' } as never });

    expect(invalidatedKeys()).toContain(JSON.stringify(['aircraft']));
    expectFlightDependentInvalidated(invalidatedKeys());
  });

  it('a failed contact rename invalidates nothing', async () => {
    PUT.mockResolvedValue({ data: undefined, error: { message: 'conflict' } });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    await expect(result.current.mutateAsync({ id: 'c1', data: { name: 'X' } })).rejects.toBeTruthy();

    expect(invalidatedKeys()).toEqual([]);
  });

  it('creating a contact or aircraft leaves flight revisions alone', async () => {
    POST.mockResolvedValue({ data: { id: 'x' }, error: undefined });
    const { wrapper, invalidatedKeys } = setup();
    const contact = renderHook(() => useCreateContact(), { wrapper });
    const aircraft = renderHook(() => useCreateAircraft(), { wrapper });

    await contact.result.current.mutateAsync({ name: 'A' });
    await aircraft.result.current.mutateAsync({ registration: 'D-EXYZ' } as never);

    expect(invalidatedKeys()).not.toContain(JSON.stringify(['flightRevisions']));
  });
});
