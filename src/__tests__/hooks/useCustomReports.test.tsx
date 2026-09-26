import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import {
  CUSTOM_REPORTS_LIST_KEY,
  filenameFromDisposition,
  useCreateCustomReport,
  useCustomReportPreview,
  useCustomReports,
  useExportCustomReport,
  useReorderCustomReports,
  useUpdateCustomReport,
} from '../../hooks/useCustomReports';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL } from '../../lib/config';
import type { CustomReport, CustomReportDefinition, CustomReportResult } from '../../lib/customReports';
import type { User } from '../../types/api';

const USER = { id: 'u1', email: 'pilot@example.com', name: 'Test Pilot' } as User;

const DEFINITION: CustomReportDefinition = {
  filter: { aircraftReg: 'D-EABC' },
  window: { kind: 'lastMonths', months: 12 },
  groupBy: 'month',
  metric: 'totalTime',
};

const report = (id: string, position: number): CustomReport => ({
  id,
  name: `Report ${id}`,
  definition: DEFINITION,
  position,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const totals = {
  flights: 0, totalTime: 0, picTime: 0, dualTime: 0, dualGivenTime: 0,
  nightTime: 0, ifrTime: 0, crossCountryTime: 0, fstdTime: 0, landings: 0,
  launches: 0, outlandings: 0, towFlights: 0,
};
const RESULT: CustomReportResult = {
  groupBy: 'month',
  metric: 'totalTime',
  rows: [],
  totals,
  otherGroups: 0,
  generatedAt: '2026-01-01T00:00:00Z',
};

const url = (path: string) =>
  new URL(`${API_BASE_URL}${path}`, globalThis.location?.origin ?? 'http://localhost').toString();

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => useAuthStore.getState().setAuth(USER, 'access-1', 'refresh-1', 900));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearAuth();
  vi.useRealTimers();
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

describe('useCustomReports', () => {
  it('lists reports with the bearer token', async () => {
    let auth: string | null = null;
    server.use(
      http.get(url('/reports/custom'), ({ request }) => {
        auth = request.headers.get('Authorization');
        return HttpResponse.json([report('a', 0)]);
      })
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCustomReports(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(auth).toBe('Bearer access-1');
    expect(result.current.data?.[0].name).toBe('Report a');
  });

  it('surfaces the API error message of a rejected create', async () => {
    server.use(
      http.post(url('/reports/custom'), () =>
        HttpResponse.json({ error: 'invalid q: unexpected token' }, { status: 400 })
      )
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateCustomReport(), { wrapper });
    act(() => result.current.mutate({ name: 'x', definition: DEFINITION }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('invalid q: unexpected token');
  });

  it('invalidates the list and that report result after an update', async () => {
    server.use(http.put(url('/reports/custom/a'), () => HttpResponse.json(report('a', 0))));
    const { wrapper, queryClient } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateCustomReport(), { wrapper });
    act(() => result.current.mutate({ id: 'a', input: { name: 'x', definition: DEFINITION } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: CUSTOM_REPORTS_LIST_KEY });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['custom-reports', 'result', 'a'] });
  });

  it('sends the full id list on reorder and stores the returned order', async () => {
    let body: unknown;
    server.use(
      http.put(url('/reports/custom/order'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json([report('b', 0), report('a', 1)]);
      }),
      http.get(url('/reports/custom'), () => HttpResponse.json([report('b', 0), report('a', 1)]))
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useReorderCustomReports(), { wrapper });
    act(() => result.current.mutate(['b', 'a']));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(body).toEqual({ reportIds: ['b', 'a'] });
    expect(queryClient.getQueryData<CustomReport[]>(CUSTOM_REPORTS_LIST_KEY)?.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('useCustomReportPreview', () => {
  it('debounces changes and posts only the settled definition', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post(url('/reports/custom/preview'), async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json(RESULT);
      })
    );
    const { wrapper } = setup();
    const { result, rerender } = renderHook(
      ({ def }: { def: CustomReportDefinition }) => useCustomReportPreview(def, true),
      { wrapper, initialProps: { def: DEFINITION } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(posted).toHaveLength(1);

    rerender({ def: { ...DEFINITION, metric: 'flights' } });
    rerender({ def: { ...DEFINITION, metric: 'landings' } });
    // Previous result stays while the new definition settles.
    expect(result.current.data).toEqual(RESULT);
    await waitFor(() => expect(posted).toHaveLength(2), { timeout: 2000 });
    expect((posted[1] as { definition: CustomReportDefinition }).definition.metric).toBe('landings');
  });

  it('does not request while disabled', async () => {
    const handler = vi.fn(() => HttpResponse.json(RESULT));
    server.use(http.post(url('/reports/custom/preview'), handler));
    const { wrapper } = setup();
    renderHook(() => useCustomReportPreview(DEFINITION, false), { wrapper });
    await new Promise((r) => setTimeout(r, 700));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useExportCustomReport', () => {
  it('downloads the file under the server-given name', async () => {
    let query = '';
    server.use(
      http.get(url('/reports/custom/a/export'), ({ request }) => {
        query = new URL(request.url).search;
        return new HttpResponse('Month,Total\n', {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="hours.csv"' },
        });
      })
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('hours.csv');
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useExportCustomReport(), { wrapper });
    act(() => result.current.mutate({ id: 'a', name: 'Hours', format: 'csv' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(query).toBe('?format=csv');
    expect(click).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('reports the API error message', async () => {
    server.use(
      http.get(url('/reports/custom/a/export'), () =>
        HttpResponse.json({ error: 'Too many requests' }, { status: 429 })
      )
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useExportCustomReport(), { wrapper });
    act(() => result.current.mutate({ id: 'a', name: 'Hours', format: 'pdf' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Too many requests');
  });
});

describe('filenameFromDisposition', () => {
  it('reads plain and RFC 5987 filenames', () => {
    expect(filenameFromDisposition('attachment; filename="night.csv"')).toBe('night.csv');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''N%C3%A4chte.pdf")).toBe('Nächte.pdf');
    expect(filenameFromDisposition(null)).toBeNull();
  });
});
