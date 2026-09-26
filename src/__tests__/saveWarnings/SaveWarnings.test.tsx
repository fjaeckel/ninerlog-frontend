import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import i18n from '../../i18n';
import { useCreateFlight, useUpdateFlight } from '../../hooks/useFlights';
import { useCreateFlightBatch } from '../../hooks/useFlightBatch';
import { useCreateAircraft, useUpdateAircraft } from '../../hooks/useAircraft';
import { useSaveWarningsStore, type SaveWarning } from '../../stores/saveWarningsStore';
import { SaveWarningsToast } from '../../components/saveWarnings/SaveWarnings';
import { FlightSavedNotice } from '../../components/flights/FlightSavedNotice';
import { saveWarningMessage } from '../../lib/saveWarnings';

const POST = vi.fn();
const PUT = vi.fn();
const PATCH = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(),
    POST: (...args: unknown[]) => POST(...args),
    PUT: (...args: unknown[]) => PUT(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
    DELETE: vi.fn(),
  },
}));

const NIGHT: SaveWarning = {
  code: 'ul_night_flight', severity: 'warning',
  params: { nightTime: 25, landingsNight: 1, registration: 'D-MXYZ', ulKind: 'THREE_AXIS' },
};
const MTOM: SaveWarning = { code: 'ul_mtom_exceeds_600', severity: 'warning', params: { mtomKg: 650, limitKg: 600 } };
const CLASS120: SaveWarning = { code: 'ul_120kg_class', severity: 'info', params: { mtomKg: 115, limitKg: 120 } };

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children,
  );

const codes = () => useSaveWarningsStore.getState().entries.map((e) => e.warning.code);

beforeEach(() => {
  vi.clearAllMocks();
  useSaveWarningsStore.setState({ entries: [], hosts: 0 });
});

describe('save warnings from the mutation hooks', () => {
  it('M4 Mehmet: POST /flights with ul_night_flight records the warning', async () => {
    POST.mockResolvedValue({ data: { id: 'f1', warnings: [NIGHT] }, error: undefined });
    const { result } = renderHook(() => useCreateFlight(), { wrapper });
    await act(() => result.current.mutateAsync({} as never));
    expect(codes()).toEqual(['ul_night_flight']);
  });

  it('PUT /flights/{id} records the warning', async () => {
    PUT.mockResolvedValue({ data: { id: 'f1', warnings: [NIGHT] }, error: undefined });
    const { result } = renderHook(() => useUpdateFlight(), { wrapper });
    await act(() => result.current.mutateAsync({ id: 'f1', data: {} as never }));
    expect(codes()).toEqual(['ul_night_flight']);
  });

  it('POST /flights/batch collects each leg and drops exact duplicates', async () => {
    const other = { ...NIGHT, params: { ...NIGHT.params, nightTime: 10 } };
    POST.mockResolvedValue({
      data: { flights: [{ id: 'a', warnings: [NIGHT] }, { id: 'b' }, { id: 'c', warnings: [NIGHT, other] }] },
      error: undefined,
    });
    const { result } = renderHook(() => useCreateFlightBatch(), { wrapper });
    await act(() => result.current.mutateAsync({} as never));
    expect(codes()).toEqual(['ul_night_flight', 'ul_night_flight']);
  });

  it('POST /aircraft records ul_mtom_exceeds_600, PATCH records ul_120kg_class', async () => {
    POST.mockResolvedValue({ data: { id: 'a1', warnings: [MTOM] }, error: undefined });
    PATCH.mockResolvedValue({ data: { id: 'a1', warnings: [CLASS120] }, error: undefined });
    const create = renderHook(() => useCreateAircraft(), { wrapper });
    await act(() => create.result.current.mutateAsync({} as never));
    const update = renderHook(() => useUpdateAircraft(), { wrapper });
    await act(() => update.result.current.mutateAsync({ id: 'a1', data: {} as never }));
    expect(codes()).toEqual(['ul_mtom_exceeds_600', 'ul_120kg_class']);
  });

  it('A1 Mark: a save without warnings records nothing', async () => {
    POST.mockResolvedValue({ data: { id: 'f1' }, error: undefined });
    const { result } = renderHook(() => useCreateFlight(), { wrapper });
    await act(() => result.current.mutateAsync({} as never));
    expect(codes()).toEqual([]);
    render(<SaveWarningsToast />);
    expect(screen.queryByTestId('save-warnings-toast')).not.toBeInTheDocument();
  });
});

describe('save warning messages', () => {
  it('renders each code in the toast, info styled neutral', () => {
    useSaveWarningsStore.getState().push([NIGHT, MTOM, CLASS120]);
    render(<SaveWarningsToast />);
    const toast = within(screen.getByTestId('save-warnings-toast'));
    expect(toast.getByTestId('save-warning-ul_night_flight')).toHaveTextContent(
      'Night time logged on ultralight D-MXYZ — German ultralights have no night privilege (LuftPersV).',
    );
    expect(toast.getByTestId('save-warning-ul_mtom_exceeds_600')).toHaveTextContent('650 kg is above the 600 kg');
    const info = toast.getByTestId('save-warning-ul_120kg_class');
    expect(info).toHaveTextContent('120 kg class');
    expect(info).toHaveAttribute('data-severity', 'info');
    expect(info.className).toContain('bg-slate-50');
    expect(toast.getByTestId('save-warning-ul_night_flight').className).toContain('bg-amber-50');
  });

  it('German texts', () => {
    const de = i18n.getFixedT('de');
    expect(saveWarningMessage(de, { ...NIGHT, params: {} })).toBe(
      'Nachtflugzeit auf einem UL eingetragen — Luftsportgeräte haben keine Nachtflugberechtigung (LuftPersV).',
    );
    expect(saveWarningMessage(de, MTOM)).toContain('650 kg liegt über der deutschen UL-Grenze von 600 kg');
    expect(saveWarningMessage(de, CLASS120)).toContain('bis 120 kg');
  });

  it('dismissing one warning keeps the others', async () => {
    const user = userEvent.setup();
    useSaveWarningsStore.getState().push([MTOM, CLASS120]);
    render(<SaveWarningsToast />);
    await user.click(within(screen.getByTestId('save-warning-ul_120kg_class')).getByRole('button', { name: 'Dismiss warning' }));
    expect(codes()).toEqual(['ul_mtom_exceeds_600']);
  });
});

describe('flight saved notice with warnings', () => {
  it('M3 Mehmet: shows the night warning inside the notice, hides the global toast and stays open', () => {
    vi.useFakeTimers();
    try {
      useSaveWarningsStore.getState().push([NIGHT]);
      const onDismiss = vi.fn();
      render(
        <>
          <FlightSavedNotice saved={{ count: 1 }} onDismiss={onDismiss} timeoutMs={1000} />
          <SaveWarningsToast />
        </>,
      );
      const notice = within(screen.getByTestId('flight-saved-notice'));
      expect(notice.getByTestId('save-warning-ul_night_flight')).toBeInTheDocument();
      expect(screen.queryByTestId('save-warnings-toast')).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(5000));
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismissing the notice clears its warnings', async () => {
    const user = userEvent.setup();
    useSaveWarningsStore.getState().push([NIGHT]);
    const onDismiss = vi.fn();
    render(<FlightSavedNotice saved={{ count: 3 }} onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith(null);
    expect(codes()).toEqual([]);
  });
});
