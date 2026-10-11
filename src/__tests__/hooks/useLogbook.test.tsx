import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateLogbookCertification,
  useFlightRevisions,
  useLogbookMode,
  useUpdateLogbookMode,
  useVoidedFlights,
} from '../../hooks/useLogbook';
import { useDeleteFlight } from '../../hooks/useFlights';
import { useUpdateLicense } from '../../hooks/useLicenses';
import { FLIGHT_DEPENDENT_QUERY_KEYS } from '../../hooks/invalidation';

const GET = vi.fn();
const PUT = vi.fn();
const POST = vi.fn();
const PATCH = vi.fn();
const DELETE = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...a: unknown[]) => GET(...a),
    PUT: (...a: unknown[]) => PUT(...a),
    POST: (...a: unknown[]) => POST(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

const mode = {
  strict: true, since: '2026-08-01T10:00:00Z', draftWindow: 'flight_day', overridesDownwardOnly: false,
  latestCertifiedThrough: null, requiredBy: [], suggestedBy: [], events: [],
};

describe('useLogbook hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the logbook mode', async () => {
    GET.mockResolvedValue({ data: mode });
    const { result } = renderHook(() => useLogbookMode(), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.data?.strict).toBe(true));
    expect(GET).toHaveBeenCalledWith('/logbook/mode');
  });

  it('switches strict mode and stores the returned mode', async () => {
    const qc = makeClient();
    PUT.mockResolvedValue({ data: { ...mode, strict: false } });
    GET.mockResolvedValue({ data: { ...mode, strict: false } });
    const { result } = renderHook(() => useUpdateLogbookMode(), { wrapper: wrap(qc) });
    await act(() => result.current.mutateAsync(false));
    expect(PUT).toHaveBeenCalledWith('/logbook/mode', { body: { strict: false } });
    expect(qc.getQueryData<typeof mode>(['logbookMode'])?.strict).toBe(false);
  });

  it('loads a flight’s revisions by id', async () => {
    GET.mockResolvedValue({ data: [{ id: 'r1' }] });
    const { result } = renderHook(() => useFlightRevisions('f1'), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(GET).toHaveBeenCalledWith('/flights/{flightId}/revisions', { params: { path: { flightId: 'f1' } } });
  });

  it('loads voided flights', async () => {
    GET.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useVoidedFlights(), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/flights/voided');
  });

  it('certifies the logbook and refreshes certifications and mode', async () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    POST.mockResolvedValue({ data: { id: 'c1', certifiedThrough: '2026-08-01', certifiedAt: 'x' } });
    const { result } = renderHook(() => useCreateLogbookCertification(), { wrapper: wrap(qc) });
    await act(() => result.current.mutateAsync('2026-08-01'));
    expect(POST).toHaveBeenCalledWith('/logbook/certifications', { body: { certifiedThrough: '2026-08-01' } });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['logbookCertifications'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['logbookMode'] });
  });

  it('rejects with the API error body', async () => {
    POST.mockResolvedValue({ error: { error: 'nope', code: 'strict_mode_required' } });
    const { result } = renderHook(() => useCreateLogbookCertification(), { wrapper: wrap(makeClient()) });
    await expect(result.current.mutateAsync('2026-08-01')).rejects.toEqual(
      expect.objectContaining({ code: 'strict_mode_required' })
    );
  });

  it('passes a trimmed delete reason as a query parameter', async () => {
    DELETE.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteFlight(), { wrapper: wrap(makeClient()) });
    await act(() => result.current.mutateAsync({ id: 'f1', reason: '  Duplicate  ' }));
    expect(DELETE).toHaveBeenCalledWith('/flights/{flightId}', {
      params: { path: { flightId: 'f1' }, query: { reason: 'Duplicate' } },
    });
    await act(() => result.current.mutateAsync('f2'));
    expect(DELETE).toHaveBeenLastCalledWith('/flights/{flightId}', {
      params: { path: { flightId: 'f2' }, query: undefined },
    });
  });

  it('refreshes the logbook mode after a licence save', async () => {
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    PATCH.mockResolvedValue({ data: { id: 'l1' } });
    const { result } = renderHook(() => useUpdateLicense(), { wrapper: wrap(qc) });
    await act(() => result.current.mutateAsync({ id: 'l1', data: { issuingCountry: 'CH' } }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['logbookMode'] });
  });

  it('treats revisions and voided flights as flight-dependent', () => {
    expect(FLIGHT_DEPENDENT_QUERY_KEYS).toEqual(
      expect.arrayContaining([['flightRevisions'], ['voidedFlights']])
    );
  });
});
