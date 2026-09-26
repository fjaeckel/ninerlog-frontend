import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlightFilesCard } from '../../components/flights/igc/FlightFilesCard';
import FlightRouteCard from '../../components/flights/FlightRouteCard';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const getMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => getMock(...args),
    DELETE: (...args: unknown[]) => deleteMock(...args),
  },
  httpStatusOf: () => undefined,
}));

const FILE = {
  id: 'file-1', flightId: 'f1', kind: 'IGC' as const, filename: '2026-08-16-LXN-3GP-01.igc',
  sizeBytes: 812_344, sha256: 'a'.repeat(64), createdAt: '2026-08-16T19:00:00Z',
};

const renderCard = (showWhenEmpty = true) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FlightFilesCard flightId="f1" showWhenEmpty={showWhenEmpty} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('FlightFilesCard', () => {
  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
  });

  it('P2 lists the stored IGC file with the Attach IGC action', async () => {
    getMock.mockResolvedValue({ data: [FILE], error: undefined });
    renderCard();
    const card = await screen.findByTestId('flight-files');
    expect(within(card).getByText(FILE.filename)).toBeInTheDocument();
    expect(within(card).getByText(/793 KB/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Attach IGC' })).toHaveAttribute('href', '/flights/import-igc?flight=f1');
    expect(getMock).toHaveBeenCalledWith('/flights/{flightId}/files', { params: { path: { flightId: 'f1' } } });
  });

  it('downloads the file as a blob', async () => {
    getMock.mockImplementation(async (path: string) =>
      path === '/flights/{flightId}/files'
        ? { data: [FILE], error: undefined }
        : { data: new Blob(['A']), error: undefined });
    const createUrl = vi.fn(() => 'blob:igc');
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: `Download ${FILE.filename}` }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(getMock).toHaveBeenCalledWith('/flights/{flightId}/files/{fileId}', {
      params: { path: { flightId: 'f1', fileId: 'file-1' } },
      parseAs: 'blob',
    });
    expect(revokeUrl).toHaveBeenCalledWith('blob:igc');
    click.mockRestore();
  });

  it('deletes a file only after confirmation', async () => {
    getMock.mockResolvedValue({ data: [FILE], error: undefined });
    deleteMock.mockResolvedValue({ error: undefined });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: `Delete ${FILE.filename}` }));
    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getByText(/is removed from this flight/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete file' }));
    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith('/flights/{flightId}/files/{fileId}', {
        params: { path: { flightId: 'f1', fileId: 'file-1' } },
      }),
    );
  });

  it('renders nothing without files when IGC import is not relevant (A1 guard)', async () => {
    getMock.mockResolvedValue({ data: [], error: undefined });
    const { container } = renderCard(false);
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows stored files even when IGC import is not relevant (data always wins)', async () => {
    getMock.mockResolvedValue({ data: [FILE], error: undefined });
    renderCard(false);
    expect(await screen.findByText(FILE.filename)).toBeInTheDocument();
  });

  it('offers Attach IGC on a relevant flight without files', async () => {
    getMock.mockResolvedValue({ data: [], error: undefined });
    renderCard(true);
    expect(await screen.findByText('No flight recorder files.')).toBeInTheDocument();
  });
});

const flight = (over: Partial<Flight> = {}): Flight => ({
  id: 'f1', userId: 'u1', date: '2026-08-16', aircraftReg: 'D-KXYZ', aircraftType: 'AS29',
  departureIcao: 'EDQD', arrivalIcao: 'EDQD', departureTime: '11:20:00', arrivalTime: '16:37:00',
  totalTime: 317, isSimulator: false, isPassenger: false, isPic: true, isDual: false, picTime: 317,
  dualTime: 0, nightTime: 0, ifrTime: 0, landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1,
  takeoffsNight: 0, nightTimeOverride: false, crossCountryTimeOverride: false, takeoffsDayOverride: false,
  takeoffsNightOverride: false, landingsDayOverride: false, landingsNightOverride: false, sicTimeOverride: false,
  multiPilotTimeOverride: false, soloTime: 0, crossCountryTime: 317, distance: 0, sicTime: 0, dualGivenTime: 0,
  simulatedFlightTime: 0, groundTrainingTime: 0, launches: 1, launchesOverride: false, isOutlanding: false,
  isTowFlight: false, createdAt: '2026-08-16T19:00:00Z', updatedAt: '2026-08-16T19:00:00Z',
  ...over,
});

describe('Flight detail glider facts', () => {
  it('P2 shows launch method, launches, release height and outlanding when set', () => {
    render(<FlightRouteCard flight={flight({ launchMethod: 'self-launch', releaseHeightM: 438, isOutlanding: true })} />);
    expect(screen.getByText('Self-Launch')).toBeInTheDocument();
    expect(screen.getByText('Launches').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Release height').nextSibling).toHaveTextContent('438 m');
    expect(screen.getByText('Outlanding').nextSibling).toHaveTextContent('Yes');
    expect(screen.queryByText('Tow flight')).not.toBeInTheDocument();
  });

  it('L1 marks a series of launches logged as one row', () => {
    render(<FlightRouteCard flight={flight({ launchMethod: 'winch', launches: 6, launchesOverride: true })} />);
    expect(screen.getByText('Launches').nextSibling).toHaveTextContent('6 (series)');
  });

  it('P1 shows the tow flight on Petra\'s DR400 tug flight', () => {
    render(<FlightRouteCard flight={flight({ aircraftReg: 'D-EPTW', aircraftType: 'DR40', isTowFlight: true })} />);
    expect(screen.getByText('Tow flight').nextSibling).toHaveTextContent('Yes');
    expect(screen.queryByText('Launches')).not.toBeInTheDocument();
  });

  it('A1 guard: an aeroplane flight shows no empty glider rows', () => {
    render(<FlightRouteCard flight={flight({ aircraftReg: 'D-AIMA', aircraftType: 'A320' })} />);
    for (const label of ['Launch Method', 'Launches', 'Release height', 'Outlanding', 'Tow flight']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });
});
