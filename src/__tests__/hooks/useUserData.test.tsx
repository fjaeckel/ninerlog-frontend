import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { RestoreError, useRestoreJSON } from '../../hooks/useImport';
import type { ImportJSONResult } from '../../hooks/useImport';
import { useDeleteAllFlights, useDeleteAllUserData } from '../../hooks/useProfile';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../lib/config';
import type { User } from '../../types/api';

const USER = { id: 'u1', email: 'pilot@example.com', name: 'Test Pilot' } as User;

const RESULT: ImportJSONResult = {
  aircraftImported: 1,
  aircraftSkipped: 0,
  licensesImported: 1,
  classRatingsImported: 1,
  licencePrivilegesImported: 0,
  flightFilesImported: 0,
  flightFilesSkipped: 0,
  pilotProfileImported: false,
  credentialsImported: 0,
  flightsImported: 2,
  crewMembersImported: 0,
  contactsImported: 0,
  contactsSkipped: 0,
  contactsCreated: 0,
  customCurrencyRulesImported: 1,
  customReportsImported: 0,
  flightRevisionsImported: 0,
  logbookCertificationsImported: 0,
  notificationPreferencesImported: false,
  flightBaselineImported: false,
  mode: 'restore',
  warnings: [{ section: 'customCurrencyRules', index: 0, message: 'restored paused' }],
};

const BACKUP_TEXT = JSON.stringify({ format: 'NinerLog JSON Backup', version: '1.0', flights: [] });
const backupFile = (text = BACKUP_TEXT) => new File([text], 'backup.json', { type: 'application/json' });

const url = (path: string) =>
  new URL(`${API_BASE_URL}${path}`, globalThis.location?.origin ?? 'http://localhost').toString();

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
beforeEach(() => useAuthStore.getState().setAuth(USER, 'access-1', 'refresh-1', 900));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearAuth();
});

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

async function restoreWith(status: number, body: Record<string, string>, file = backupFile()) {
  server.use(http.post(url('/users/me/data'), () => HttpResponse.json(body, { status })));
  const { wrapper } = setup();
  const { result } = renderHook(() => useRestoreJSON(), { wrapper });
  act(() => result.current.mutate({ file }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  return result.current.error;
}

describe('useRestoreJSON', () => {
  it('posts the file text verbatim to /users/me/data with mode=restore by default', async () => {
    let mode: string | null = null;
    let body = '';
    let auth: string | null = null;
    server.use(
      http.post(url('/users/me/data'), async ({ request }) => {
        mode = new URL(request.url).searchParams.get('mode');
        auth = request.headers.get('Authorization');
        body = await request.text();
        return HttpResponse.json(RESULT);
      })
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useRestoreJSON(), { wrapper });
    act(() => result.current.mutate({ file: backupFile() }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mode).toBe('restore');
    expect(auth).toBe('Bearer access-1');
    expect(body).toBe(BACKUP_TEXT);
    expect(result.current.data?.warnings).toHaveLength(1);
  });

  it('H2: sends mode=replace when asked', async () => {
    let mode: string | null = null;
    server.use(
      http.post(url('/users/me/data'), ({ request }) => {
        mode = new URL(request.url).searchParams.get('mode');
        return HttpResponse.json({ ...RESULT, mode: 'replace' });
      })
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useRestoreJSON(), { wrapper });
    act(() => result.current.mutate({ file: backupFile(), mode: 'replace' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mode).toBe('replace');
  });

  it('invalidates every query after a restore', async () => {
    server.use(http.post(url('/users/me/data'), () => HttpResponse.json(RESULT)));
    const { wrapper, queryClient } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRestoreJSON(), { wrapper });
    act(() => result.current.mutate({ file: backupFile() }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith();
  });

  it('types 409 account_not_empty', async () => {
    const err = await restoreWith(409, { error: 'The account already holds data', code: 'account_not_empty' });
    expect(err).toBeInstanceOf(RestoreError);
    expect((err as RestoreError).kind).toBe('account_not_empty');
    expect((err as RestoreError).status).toBe(409);
  });

  it('types 409 replace_would_drop_attachments', async () => {
    const err = await restoreWith(409, { error: 'Replacing would delete', code: 'replace_would_drop_attachments' });
    expect((err as RestoreError).kind).toBe('replace_would_drop_attachments');
  });

  it('types 422 backup_version_unsupported', async () => {
    const err = await restoreWith(422, { error: 'newer version', code: 'backup_version_unsupported' });
    expect((err as RestoreError).kind).toBe('backup_version_unsupported');
  });

  it('types 413 as too_large', async () => {
    const err = await restoreWith(413, { error: 'Request body too large' });
    expect((err as RestoreError).kind).toBe('too_large');
  });

  it('keeps the API message of a 400 as a generic error', async () => {
    const err = await restoreWith(400, { error: 'Unsupported backup format' });
    expect((err as RestoreError).kind).toBe('generic');
    expect((err as RestoreError).message).toBe('Unsupported backup format');
  });

  it('rejects broken JSON before any request', async () => {
    const handler = vi.fn(() => HttpResponse.json(RESULT));
    server.use(http.post(url('/users/me/data'), handler));
    const { wrapper } = setup();
    const { result } = renderHook(() => useRestoreJSON(), { wrapper });
    act(() => result.current.mutate({ file: backupFile('{not json') }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as RestoreError).kind).toBe('invalid_json');
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects a JSON value that is not an object', async () => {
    const handler = vi.fn(() => HttpResponse.json(RESULT));
    server.use(http.post(url('/users/me/data'), handler));
    const { wrapper } = setup();
    const { result } = renderHook(() => useRestoreJSON(), { wrapper });
    act(() => result.current.mutate({ file: backupFile('[1,2]') }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as RestoreError).kind).toBe('not_a_backup');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useDeleteAllFlights', () => {
  it('deletes with scope=flights and reports deletedFlights', async () => {
    let scope: string | null = null;
    server.use(
      http.delete(url('/users/me/data'), ({ request }) => {
        scope = new URL(request.url).searchParams.get('scope');
        return HttpResponse.json({ message: 'Flights deleted', deletedFlights: 42 });
      })
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteAllFlights(), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(scope).toBe('flights');
    expect(result.current.data).toEqual({ deleted: 42 });
  });
});

describe('useDeleteAllUserData', () => {
  it('deletes with scope=all', async () => {
    let scope: string | null = null;
    server.use(
      http.delete(url('/users/me/data'), ({ request }) => {
        scope = new URL(request.url).searchParams.get('scope');
        return HttpResponse.json({ message: 'All user data deleted successfully' });
      })
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteAllUserData(), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(scope).toBe('all');
  });
});
