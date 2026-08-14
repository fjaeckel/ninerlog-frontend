import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateContact, useDeleteContact } from '../../hooks/useContacts';
import type { Contact } from '../../types/api';

const PUT = vi.fn();
const DELETE = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    PUT: (...args: unknown[]) => PUT(...args),
    DELETE: (...args: unknown[]) => DELETE(...args),
  },
}));

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

const contact: Contact = {
  id: 'c1',
  userId: 'u1',
  name: 'Hans Müller',
  email: null,
  phone: null,
  notes: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/** A PUT result carrying the given response headers. */
const putResult = (headers: Record<string, string>) => ({
  data: contact,
  error: undefined,
  response: new Response(null, { status: 200, headers }),
});

describe('useUpdateContact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the renamed crew-entry count off the response header', async () => {
    PUT.mockResolvedValue(putResult({ 'X-Crew-Entries-Renamed': '4' }));
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(makeClient()) });

    const res = await result.current.mutateAsync({ id: 'c1', data: { name: 'Hans Mueller' } });

    expect(res.crewEntriesRenamed).toBe(4);
    expect(res.contact).toEqual(contact);
  });

  // An older API does not send the header at all. That is not the same as
  // "renamed nothing" — the client must not claim a count it never got.
  it('reports null when the server sends no count', async () => {
    PUT.mockResolvedValue(putResult({}));
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(makeClient()) });

    const res = await result.current.mutateAsync({ id: 'c1', data: { name: 'Hans Mueller' } });

    expect(res.crewEntriesRenamed).toBeNull();
  });

  it('reports null rather than NaN for an unparseable count', async () => {
    PUT.mockResolvedValue(putResult({ 'X-Crew-Entries-Renamed': 'not-a-number' }));
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(makeClient()) });

    const res = await result.current.mutateAsync({ id: 'c1', data: { name: 'Hans Mueller' } });

    expect(res.crewEntriesRenamed).toBeNull();
  });

  // A rename rewrites the crew entries of unsigned flights server-side, so any
  // cached flight is stale afterwards.
  it('invalidates flights when the rename reached the logbook', async () => {
    PUT.mockResolvedValue(putResult({ 'X-Crew-Entries-Renamed': '2' }));
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(qc) });

    await result.current.mutateAsync({ id: 'c1', data: { name: 'Hans Mueller' } });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['flights'] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['contacts'] });
  });

  it('leaves the flights cache alone when nothing was renamed', async () => {
    PUT.mockResolvedValue(putResult({ 'X-Crew-Entries-Renamed': '0' }));
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(qc) });

    await result.current.mutateAsync({ id: 'c1', data: { email: 'h@example.com', name: 'Hans Müller' } });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['contacts'] }));
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['flights'] });
  });

  // Without a count there is no way to know the logbook was untouched, so the
  // safe reading is "assume it changed".
  it('invalidates flights when the count is unknown', async () => {
    PUT.mockResolvedValue(putResult({}));
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(qc) });

    await result.current.mutateAsync({ id: 'c1', data: { name: 'Hans Mueller' } });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['flights'] }));
  });

  it('throws the API error body so callers can read its status', async () => {
    PUT.mockResolvedValue({
      data: undefined,
      error: { error: 'A contact with this name already exists', httpStatus: 409 },
      response: new Response(null, { status: 409 }),
    });
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrap(makeClient()) });

    await expect(
      result.current.mutateAsync({ id: 'c1', data: { name: 'Anna Berg' } }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe('useDeleteContact', () => {
  beforeEach(() => vi.clearAllMocks());

  // Deleting drops the link but keeps the crew name, so a cached flight still
  // carries a contactId that no longer resolves.
  it('invalidates both contacts and flights', async () => {
    DELETE.mockResolvedValue({ error: undefined });
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteContact(), { wrapper: wrap(qc) });

    await result.current.mutateAsync('c1');

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['contacts'] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['flights'] });
  });
});
