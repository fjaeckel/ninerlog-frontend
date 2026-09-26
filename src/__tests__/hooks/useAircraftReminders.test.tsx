import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useAircraftReminders,
  useAllAircraftReminders,
  useCompleteAircraftReminder,
  useCreateAircraftReminder,
  useDeleteAircraftReminder,
  useUpdateAircraftReminder,
} from '../../hooks/useAircraftReminders';
import { useDeleteAircraft, useUpdateAircraft } from '../../hooks/useAircraft';

const GET = vi.fn();
const POST = vi.fn();
const PATCH = vi.fn();
const DELETE = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
    DELETE: (...args: unknown[]) => DELETE(...args),
  },
}));

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

const reminder = { id: 'r1', aircraftId: 'a1', kind: 'ANNUAL_INSPECTION', dueDate: '2026-09-01' };

describe('useAircraftReminders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists one aircraft by its path', async () => {
    GET.mockResolvedValue({ data: [reminder], error: undefined });
    const { result } = renderHook(() => useAircraftReminders('a1'), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.data).toEqual([reminder]));
    expect(GET).toHaveBeenCalledWith('/aircraft/{aircraftId}/reminders', { params: { path: { aircraftId: 'a1' } } });
  });

  it('lists across the fleet with dueWithinDays', async () => {
    GET.mockResolvedValue({ data: [reminder], error: undefined });
    const { result } = renderHook(() => useAllAircraftReminders(30), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/aircraft-reminders', { params: { query: { dueWithinDays: 30 } } });
  });

  it('lists the whole fleet without a filter', async () => {
    GET.mockResolvedValue({ data: [], error: undefined });
    const { result } = renderHook(() => useAllAircraftReminders(), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/aircraft-reminders', { params: { query: {} } });
  });

  it('surfaces an API error', async () => {
    GET.mockResolvedValue({ data: undefined, error: { error: 'boom' } });
    const { result } = renderHook(() => useAllAircraftReminders(30), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('reminder mutations invalidate every reminder list', () => {
  beforeEach(() => vi.clearAllMocks());

  const cases: [string, () => { mutateAsync: (v: never) => Promise<unknown> }, unknown, () => void][] = [
    ['create', useCreateAircraftReminder as never, { aircraftId: 'a1', data: { kind: 'INSURANCE', dueDate: '2026-12-31' } },
      () => POST.mockResolvedValue({ data: reminder, error: undefined })],
    ['update', useUpdateAircraftReminder as never, { aircraftId: 'a1', reminderId: 'r1', data: { notes: null } },
      () => PATCH.mockResolvedValue({ data: reminder, error: undefined })],
    ['delete', useDeleteAircraftReminder as never, { aircraftId: 'a1', reminderId: 'r1' },
      () => DELETE.mockResolvedValue({ error: undefined })],
    ['complete', useCompleteAircraftReminder as never, { aircraftId: 'a1', reminderId: 'r1', doneOn: '2026-08-16' },
      () => POST.mockResolvedValue({ data: reminder, error: undefined })],
  ];

  it.each(cases)('%s invalidates per-aircraft and fleet-wide keys', async (_name, hook, vars, arrange) => {
    arrange();
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => hook(), { wrapper: wrap(qc) });
    await act(async () => {
      await result.current.mutateAsync(vars as never);
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['aircraft-reminders'] });
  });

  it('complete sends doneOn to the complete endpoint', async () => {
    POST.mockResolvedValue({ data: reminder, error: undefined });
    const { result } = renderHook(() => useCompleteAircraftReminder(), { wrapper: wrap(makeClient()) });
    await act(async () => {
      await result.current.mutateAsync({ aircraftId: 'a1', reminderId: 'r1', doneOn: '2026-08-16' });
    });
    expect(POST).toHaveBeenCalledWith('/aircraft/{aircraftId}/reminders/{reminderId}/complete', {
      params: { path: { aircraftId: 'a1', reminderId: 'r1' } },
      body: { doneOn: '2026-08-16' },
    });
  });

  it('a failed mutation does not invalidate', async () => {
    DELETE.mockResolvedValue({ error: { error: 'not found' } });
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteAircraftReminder(), { wrapper: wrap(qc) });
    await act(async () => {
      await expect(result.current.mutateAsync({ aircraftId: 'a1', reminderId: 'r1' })).rejects.toBeTruthy();
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('updating or deleting an aircraft refreshes reminders', async () => {
    PATCH.mockResolvedValue({ data: {}, error: undefined });
    DELETE.mockResolvedValue({ error: undefined });
    const qc = makeClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result: upd } = renderHook(() => useUpdateAircraft(), { wrapper: wrap(qc) });
    await act(async () => {
      await upd.current.mutateAsync({ id: 'a1', data: { registration: 'D-MIKB', renameFlights: false } });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['aircraft-reminders'] });
    spy.mockClear();
    const { result: del } = renderHook(() => useDeleteAircraft(), { wrapper: wrap(qc) });
    await act(async () => {
      await del.current.mutateAsync('a1');
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['aircraft-reminders'] });
  });
});
