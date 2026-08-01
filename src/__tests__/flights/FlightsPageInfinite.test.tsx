import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightsPage from '../../pages/flights/FlightsPage';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const flight = (id: string, date: string): Flight =>
  ({
    id,
    userId: 'user-1',
    date,
    aircraftReg: 'D-EFGH',
    aircraftType: 'C172',
    departureIcao: 'EDDF',
    arrivalIcao: 'EDDH',
    offBlockTime: '10:00:00',
    onBlockTime: '11:30:00',
    totalTime: 90,
    isPic: true,
    isDual: false,
    picTime: 90,
    dualTime: 0,
    nightTime: 0,
    ifrTime: 0,
    soloTime: 0,
    crossCountryTime: 0,
    landingsDay: 1,
    landingsNight: 0,
    allLandings: 1,
    takeoffsDay: 1,
    takeoffsNight: 0,
    distance: 0,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  }) as Flight;

const pageOf = (flights: Flight[], page: number, totalPages: number) => ({
  data: flights,
  pagination: { page, pageSize: 20, total: totalPages * 20, totalPages },
});

/**
 * jsdom reports a 1024px-wide window, so `(min-width: 1024px)` matches and the
 * page takes its desktop branch by default. A phone has to be asked for.
 */
function setViewport(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/flights']}>
        <Routes>
          <Route path="/flights" element={<FlightsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The infinite query's return, with only what the page reads from it. */
const infinite = (over: Record<string, unknown> = {}) =>
  ({
    data: { pages: [pageOf([flight('a', '2026-01-15')], 1, 1)], pageParams: [1] },
    isLoading: false,
    error: null,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...over,
  }) as unknown as ReturnType<typeof useFlightsHook.useInfiniteFlights>;

describe('FlightsPage — endless scroll on a phone', () => {
  let useFlightsSpy: ReturnType<typeof vi.spyOn>;
  let useInfiniteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setViewport(false);
    useFlightsSpy = vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as never);
    useInfiniteSpy = vi.spyOn(useFlightsHook, 'useInfiniteFlights').mockReturnValue(infinite());
    vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('runs only the scrolling query, never both', () => {
    renderPage();

    expect(useInfiniteSpy.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: true });
    expect(useFlightsSpy.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: false });
  });

  it('leaves the page out of the scrolling query, so one list caches once', () => {
    renderPage();

    expect(useInfiniteSpy.mock.calls.at(-1)?.[0]).not.toHaveProperty('page');
  });

  it('shows every loaded page as one list', () => {
    useInfiniteSpy.mockReturnValue(
      infinite({
        data: {
          pages: [
            pageOf([flight('a', '2026-01-15')], 1, 2),
            pageOf([flight('b', '2026-01-11')], 2, 2),
          ],
          pageParams: [1, 2],
        },
      })
    );
    renderPage();

    expect(screen.getAllByRole('button', { name: /^Flight EDDF/ })).toHaveLength(2);
  });

  it('offers the next page, and asks for it when told to', async () => {
    const fetchNextPage = vi.fn();
    useInfiniteSpy.mockReturnValue(infinite({ hasNextPage: true, fetchNextPage }));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /load more flights/i }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('keeps the flights already read when a later page fails', () => {
    useInfiniteSpy.mockReturnValue(
      infinite({ isError: true, error: new Error('network'), hasNextPage: true })
    );
    renderPage();

    // The list survives; the failure is reported where it happened
    expect(screen.getByRole('button', { name: /^Flight EDDF/ })).toBeInTheDocument();
    expect(screen.getByText(/could not load more/i)).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('still reports a first load that failed with nothing to show', () => {
    useInfiniteSpy.mockReturnValue(
      infinite({ data: undefined, isError: true, error: new Error('network') })
    );
    renderPage();

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('has no page buttons — the list scrolls instead', () => {
    useInfiniteSpy.mockReturnValue(
      infinite({ data: { pages: [pageOf([flight('a', '2026-01-15')], 1, 5)], pageParams: [1] } })
    );
    renderPage();

    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
  });
});

describe('FlightsPage — the table still pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewport(true);
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
      data: pageOf([flight('a', '2026-01-15')], 1, 3),
      isLoading: false,
      error: null,
    } as never);
    vi.spyOn(useFlightsHook, 'useInfiniteFlights').mockReturnValue(infinite({ data: undefined }));
    vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps its page buttons and leaves the scrolling query switched off', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });
});
