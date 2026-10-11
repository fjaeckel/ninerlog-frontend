import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightDetailPage from '../../pages/flights/FlightDetailPage';

const flightState: { data: Record<string, unknown> } = { data: {} };
const deleteMutate = vi.fn();

vi.mock('../../hooks/useFlights', () => ({
  useFlight: () => ({ data: flightState.data, isLoading: false, error: null }),
  useDeleteFlight: () => ({ mutateAsync: deleteMutate, isPending: false }),
}));
vi.mock('../../hooks/useLogbook', () => ({
  useIsStrictLogbook: () => true,
  useLogbookStrictness: () => 'strict',
  useLogbookMode: () => ({ data: { strict: true, since: '2026-07-17T10:00:00Z' } }),
  useFlightRevisions: () => ({ data: [], isError: false }),
}));
vi.mock('../../components/flights/SignatureSection', () => ({ SignatureSection: () => null }));
vi.mock('../../components/flights/FlightCrewCard', () => ({ FlightCrewCard: () => null }));
vi.mock('../../components/flights/FlightForm', () => ({ default: () => null }));
vi.mock('../../components/flights/FlightNeighborNav', () => ({ default: () => null }));

const baseFlight = {
  id: 'f1', userId: 'u1', date: '2026-08-14', aircraftReg: 'D-EABC', aircraftType: 'C172',
  departureIcao: 'EDDF', arrivalIcao: 'EDDH', departureTime: '09:15', arrivalTime: '10:45',
  totalTime: 95, picTime: 95, dualTime: 0, nightTime: 0, ifrTime: 0, soloTime: 0, crossCountryTime: 95,
  landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1, takeoffsNight: 0,
  isSimulator: false, isPassenger: false, crewMembers: [], signatureId: null,
  createdAt: '2026-08-14T12:00:00Z', updatedAt: '2026-08-14T12:00:00Z',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/flights/f1']}>
        <Routes>
          <Route path="/flights/:flightId" element={<FlightDetailPage />} />
          <Route path="/flights" element={<p>flights list</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('FlightDetailPage in strict mode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides Delete on a signed flight', () => {
    flightState.data = { ...baseFlight, signatureId: 'sig1' };
    renderPage();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows the History card', () => {
    flightState.data = baseFlight;
    renderPage();
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
  });

  it('deletes with the void reason', async () => {
    flightState.data = baseFlight;
    deleteMutate.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toHaveFocus());
    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), 'Duplicate');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /delete flight/i }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith({ id: 'f1', reason: 'Duplicate' }));
    expect(await screen.findByText('flights list')).toBeInTheDocument();
  });
});
