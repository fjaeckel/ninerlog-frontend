import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import QuickLogPage from '../../pages/quicklog/QuickLogPage';

const sessionState: { current: Record<string, unknown> | null } = { current: null };
const recordEvent = vi.fn();
const updateFlight = vi.fn();

const aircraft = (registration: string, type: string, aircraftClass: string) => ({
  id: registration, registration, type, aircraftClass, ulKind: null, isActive: true,
});
const fleetState = { fleet: [aircraft('D-1234', 'AS21', 'GLIDER'), aircraft('D-EMKC', 'C172', 'SEP_LAND')] };

vi.mock('../../hooks/useFlightSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useFlightSession')>();
  return {
    ...actual,
    useCurrentFlightSession: () => ({ data: sessionState.current, isLoading: false }),
    useRecordFlightSessionEvent: () => ({ mutateAsync: recordEvent, isPending: false }),
    useDiscardFlightSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useQuickLogQueueSync: () => undefined,
  };
});
vi.mock('../../hooks/useAircraft', () => ({
  useAircraft: () => ({ data: fleetState.fleet }),
  useCreateAircraft: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../../hooks/useFlights', () => ({
  useUpdateFlight: () => ({ mutateAsync: updateFlight, isPending: false }),
}));

const openSession = (over: Record<string, unknown>) => ({
  id: 's1', userId: 'u1', status: 'open', aircraftReg: 'D-1234',
  createdAt: '2026-08-08T10:00:00Z', updatedAt: '2026-08-08T10:00:00Z', ...over,
});

const renderPage = () => render(<MemoryRouter><QuickLogPage /></MemoryRouter>);
const select = (reg: string) => userEvent.setup().selectOptions(screen.getByLabelText('Aircraft'), reg);

describe('QuickLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, fail: () => void) => fail() },
    });
    sessionState.current = null;
    fleetState.fleet = [aircraft('D-1234', 'AS21', 'GLIDER'), aircraft('D-EMKC', 'C172', 'SEP_LAND')];
  });

  it('L3: a glider leads with TAKEOFF and folds OFF BLOCK under More', async () => {
    const user = userEvent.setup();
    renderPage();
    await select('D-1234');

    expect(screen.getByRole('button', { name: 'TAKEOFF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OFF BLOCK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start with OFF BLOCK' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More: block times' }));
    await user.click(screen.getByRole('button', { name: 'Start with OFF BLOCK' }));
    await waitFor(() => expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'offblock', aircraftReg: 'D-1234' })));
  });

  it('L3: the glider launch method is offered as chips', async () => {
    renderPage();
    await select('D-1234');
    expect(screen.getByRole('radiogroup', { name: 'Launch Method' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Winch' })).toBeInTheDocument();
  });

  it.each([
    ['TMG', 'TMG'],
    ['three-axis UL', 'ULTRALIGHT'],
  ])('%s leads with TAKEOFF too, without launch chips', async (_name, cls) => {
    fleetState.fleet = [aircraft('D-KXYZ', 'SF25', cls)];
    renderPage();
    expect(screen.getByRole('button', { name: 'TAKEOFF' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Launch Method' })).not.toBeInTheDocument();
  });

  it('A2: an aeroplane keeps OFF BLOCK first, no More, no launch method', async () => {
    renderPage();
    await select('D-EMKC');
    expect(screen.getByRole('button', { name: 'OFF BLOCK' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'TAKEOFF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More: block times' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Launch Method' })).not.toBeInTheDocument();
    expect(screen.getByText(/flight log is created when you go on blocks/)).toBeInTheDocument();
  });

  it('L1: take-off opens the session; the next tap is LANDING with no on-block skip', async () => {
    const user = userEvent.setup();
    recordEvent.mockResolvedValue({ session: openSession({ takeoffAt: '2026-08-08T10:00:00Z' }), queued: false });
    const { rerender } = renderPage();
    await select('D-1234');
    await user.click(screen.getByRole('button', { name: 'TAKEOFF' }));
    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'takeoff', aircraftReg: 'D-1234' }));

    sessionState.current = openSession({ takeoffAt: '2026-08-08T10:00:00Z' });
    rerender(<MemoryRouter><QuickLogPage /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'LANDING' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip to ON BLOCK' })).not.toBeInTheDocument();
    expect(screen.getByText('Flight time')).toBeInTheDocument();
    expect(screen.queryByText('Off block')).not.toBeInTheDocument();
    expect(screen.queryByText('On block')).not.toBeInTheDocument();
  });

  it('L1: landing completes the flight and records the chosen launch method', async () => {
    const user = userEvent.setup();
    sessionState.current = openSession({ takeoffAt: '2026-08-08T10:00:00Z' });
    recordEvent.mockResolvedValue({
      session: openSession({ status: 'completed', takeoffAt: '2026-08-08T10:00:00Z', landingAt: '2026-08-08T10:08:00Z', flightId: 'f9' }),
      queued: false,
    });
    updateFlight.mockResolvedValue({ id: 'f9' });
    renderPage();

    await user.click(screen.getByRole('radio', { name: 'Winch' }));
    await user.click(screen.getByRole('button', { name: 'LANDING' }));

    expect(recordEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'landing' }));
    await waitFor(() => expect(updateFlight).toHaveBeenCalledWith({ id: 'f9', data: { launchMethod: 'winch' } }));
    expect(await screen.findByText('Flight logged!')).toBeInTheDocument();
    expect(screen.getByText(/Take-off, landing and total time were filled in/)).toBeInTheDocument();
  });

  it('a block-time session keeps its order and the on-block skip, even for a glider', () => {
    sessionState.current = openSession({ offBlockAt: '2026-08-08T09:55:00Z' });
    renderPage();
    expect(screen.getByRole('button', { name: 'TAKEOFF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip to ON BLOCK' })).toBeInTheDocument();
    expect(screen.getByText('Block time')).toBeInTheDocument();
  });
});
