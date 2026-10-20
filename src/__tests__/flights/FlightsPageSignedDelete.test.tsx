import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightsPage from '../../pages/flights/FlightsPage';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';
import * as useLogbookHook from '../../hooks/useLogbook';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const flight = (id: string, arrivalIcao: string, signatureId: string | null): Flight =>
  ({
    id, userId: 'user-1', date: '2026-01-15', aircraftReg: 'D-EFGH', aircraftType: 'C172',
    departureIcao: 'EDDF', arrivalIcao, offBlockTime: '10:00:00', onBlockTime: '11:30:00', totalTime: 90,
    isPic: true, isDual: false, picTime: 90, dualTime: 0, nightTime: 0, ifrTime: 0, soloTime: 0,
    crossCountryTime: 0, landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1, takeoffsNight: 0,
    distance: 0, signatureId, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  }) as Flight;

const HINT = "Signed flights can't be deleted. Void the signature first.";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/flights']}>
        <Routes>
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/flights/:flightId" element={<p>flight detail</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FlightsPage — delete on signed flights', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
      data: {
        data: [flight('signed', 'EDDH', 'sig1'), flight('open', 'EDDM', null)],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    } as never);
    vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
    vi.spyOn(useLogbookHook, 'useLogbookMode').mockReturnValue({
      data: { strict: true, voidedCount: 0, requiredBy: [], suggestedBy: [], events: [] },
    } as never);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows an unavailable delete with the reason on a signed row, and a delete button on an unsigned one', async () => {
    renderPage();
    const [signedRow, openRow] = screen.getAllByTestId('flight-row-actions');

    expect(within(signedRow).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    const hint = within(signedRow).getByRole('img', { name: HINT });
    expect(hint).toHaveAttribute('title', HINT);

    expect(within(openRow).getByRole('button', { name: /delete flight edDF.*EDDM/i })).toBeInTheDocument();
    expect(within(openRow).queryByRole('img', { name: HINT })).not.toBeInTheDocument();

    await userEvent.click(hint);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
