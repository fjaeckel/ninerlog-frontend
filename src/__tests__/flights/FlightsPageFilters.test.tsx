import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightsPage from '../../pages/flights/FlightsPage';
import FlightDetailPage from '../../pages/flights/FlightDetailPage';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';

const flight = {
  id: 'flight-1',
  date: '2026-01-15',
  departureIcao: 'EDDF',
  arrivalIcao: 'EDDH',
  aircraftReg: 'D-EFGH',
  aircraftType: 'C172',
  offBlockTime: '10:00:00',
  onBlockTime: '11:30:00',
  totalTime: 90,
  picTime: 90,
  dualTime: 0,
  soloTime: 0,
  crossCountryTime: 0,
  nightTime: 0,
  allLandings: 1,
  takeoffsDay: 1,
  takeoffsNight: 0,
  isPic: true,
  isDual: false,
  remarks: '',
  createdAt: '2026-01-15T12:00:00Z',
  updatedAt: '2026-01-15T12:00:00Z',
  approaches: [],
};

// Reports the current URL so tests can assert what the page wrote into it.
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/flights/:flightId" element={<FlightDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FlightsPage filter persistence', () => {
  let useFlightsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useFlightsSpy = vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
      data: { data: [flight], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    } as any);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({
      data: flight,
      isLoading: false,
      error: null,
    } as any);
    vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as any);
  });

  const lastQuery = () => useFlightsSpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;

  it('restores search, filters, sort and page from the URL', () => {
    renderAt('/flights?q=night&departureIcao=EDDF&sortBy=totalTime&sortOrder=asc&page=2');

    expect(lastQuery()).toMatchObject({
      q: 'night',
      departureIcao: 'EDDF',
      sortBy: 'totalTime',
      sortOrder: 'asc',
      page: 2,
    });
    expect(screen.getByDisplayValue('night')).toBeInTheDocument();
    // A filter coming from the URL opens the panel so it is not applied invisibly
    expect(screen.getByDisplayValue('EDDF')).toBeInTheDocument();
  });

  it('writes the search query into the URL after the debounce', async () => {
    const user = userEvent.setup();
    renderAt('/flights');

    await user.type(screen.getByRole('combobox', { name: /search flights/i }), 'EDDF');

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/flights?q=EDDF');
    });
  });

  it('keeps the filters when opening a flight and going back', async () => {
    const user = userEvent.setup();
    renderAt('/flights?q=night&page=2');

    await user.click(screen.getByText('EDDF → EDDH'));
    expect(screen.getByTestId('location').textContent).toBe('/flights/flight-1');

    await user.click(screen.getByRole('button', { name: /back to flights/i }));
    expect(screen.getByTestId('location').textContent).toBe('/flights?q=night&page=2');
    expect(lastQuery()).toMatchObject({ q: 'night', page: 2 });
  });
});
