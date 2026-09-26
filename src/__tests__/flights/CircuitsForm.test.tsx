import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CircuitsForm } from '../../components/flights/CircuitsForm';
import { addMinutes } from '../../lib/circuits';

const batchMutate = vi.fn();
const createMutate = vi.fn();

vi.mock('../../hooks/useFlightBatch', () => ({
  useCreateFlightBatch: () => ({ mutateAsync: batchMutate, isPending: false }),
}));
vi.mock('../../hooks/useFlights', () => ({
  useCreateFlight: () => ({ mutateAsync: createMutate, isPending: false }),
}));
vi.mock('../../hooks/useAircraft', () => ({
  useAircraft: () => ({
    data: [
      {
        id: 'a1', registration: 'D-1234', type: 'AS21', aircraftClass: 'GLIDER', isActive: true,
      },
    ],
  }),
}));
vi.mock('../../hooks/useContacts', () => ({
  useSearchContacts: () => ({ data: [] }),
}));

const lena = {
  date: '2026-08-08',
  aircraftReg: 'D-1234',
  aircraftType: 'AS21',
  departureIcao: 'EDLO',
  arrivalIcao: 'EDLO',
  launchMethod: 'winch',
  crew: [],
  remarks: '',
};

const takeoff = (i: number) => document.getElementById(`circuit-${i}-takeoff`) as HTMLInputElement;
const landing = (i: number) => document.getElementById(`circuit-${i}-landing`) as HTMLInputElement;

/** Six 8-minute circuits from 10:00, typed with the keyboard only. */
async function typeSixCircuits(user: ReturnType<typeof userEvent.setup>) {
  await user.click(takeoff(0));
  await user.keyboard('1000{Enter}');
  await user.keyboard('1008{Enter}');
  for (let i = 1; i < 6; i++) {
    expect(document.activeElement).toBe(landing(i));
    await user.keyboard(addMinutes('10:00', i * 13 + 8));
    if (i < 5) await user.keyboard('{Enter}');
    else await user.tab();
  }
}

describe('CircuitsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('L1: six winch circuits are one POST /flights/batch with six legs and the shared template', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    batchMutate.mockResolvedValue({ flights: new Array(6).fill({}) });
    render(<CircuitsForm initial={lena} onBack={vi.fn()} onSaved={onSaved} />);

    await typeSixCircuits(user);

    // "Add circuit" pre-fills the next take-off five minutes after the landing.
    expect(takeoff(1).value).toBe('10:13');
    expect(screen.getAllByTestId(/^circuit-row-/)).toHaveLength(6);
    for (let i = 0; i < 6; i++) expect(screen.getByTestId(`circuit-duration-${i}`)).toHaveTextContent('0h 8m');
    expect(screen.getByTestId('circuits-total')).toHaveTextContent('6 circuits · 0h 48m');

    await user.click(screen.getByRole('button', { name: 'Log 6 flights' }));

    expect(batchMutate).toHaveBeenCalledTimes(1);
    const body = batchMutate.mock.calls[0][0];
    expect(body.template).toMatchObject({
      date: '2026-08-08',
      isSimulator: false,
      aircraftReg: 'D-1234',
      aircraftType: 'AS21',
      departureIcao: 'EDLO',
      arrivalIcao: 'EDLO',
      launchMethod: 'winch',
      landings: 1,
    });
    expect(body.template).not.toHaveProperty('offBlockTime');
    expect(body.legs).toHaveLength(6);
    expect(body.legs[0]).toEqual({ departureTime: '10:00:00', arrivalTime: '10:08:00' });
    expect(body.legs[5]).toEqual({ departureTime: '11:05:00', arrivalTime: '11:13:00' });
    expect(onSaved).toHaveBeenCalledWith(6);
  });

  it('L1: arrival defaults to the site when left empty', async () => {
    const user = userEvent.setup();
    batchMutate.mockResolvedValue({ flights: [{}] });
    render(<CircuitsForm initial={{ ...lena, arrivalIcao: '' }} onBack={vi.fn()} onSaved={vi.fn()} />);
    await user.click(takeoff(0));
    await user.keyboard('1000{Enter}1008');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Log 1 flight' }));
    expect(batchMutate.mock.calls[0][0].template.arrivalIcao).toBe('EDLO');
  });

  it('L1: a "Leg 2:" rejection is shown on the third row and nothing is reported saved', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    batchMutate.mockRejectedValue({ error: 'Leg 2: releaseHeightM must be between 0 and 20000' });
    render(<CircuitsForm initial={lena} onBack={vi.fn()} onSaved={onSaved} />);

    await typeSixCircuits(user);
    await user.click(screen.getByRole('button', { name: 'Log 6 flights' }));

    const row3 = screen.getByTestId('circuit-row-2');
    expect(within(row3).getByRole('alert')).toHaveTextContent('releaseHeightM must be between 0 and 20000');
    expect(screen.queryByTestId('circuit-error-0')).not.toBeInTheDocument();
    expect(screen.getByText('Circuit 3 was not accepted. Nothing was saved.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('flags an incomplete row without sending', async () => {
    const user = userEvent.setup();
    render(<CircuitsForm initial={lena} onBack={vi.fn()} onSaved={vi.fn()} />);
    await user.click(takeoff(0));
    await user.keyboard('1000');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Log 1 flight' }));
    expect(screen.getByTestId('circuit-error-0')).toHaveTextContent('Enter take-off and landing.');
    expect(batchMutate).not.toHaveBeenCalled();
  });

  it('L1: one line (series) logs one flight with launches set', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    createMutate.mockResolvedValue({ id: 'f1' });
    render(<CircuitsForm initial={lena} onBack={vi.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole('radio', { name: 'One line (series)' }));
    await user.click(takeoff(0));
    await user.keyboard('1000');
    await user.click(landing(0));
    await user.keyboard('1113');
    await user.type(screen.getByLabelText('Launches'), '6');
    await user.click(screen.getByRole('button', { name: 'Log series' }));

    expect(batchMutate).not.toHaveBeenCalled();
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({
      aircraftReg: 'D-1234',
      launchMethod: 'winch',
      departureTime: '10:00:00',
      arrivalTime: '11:13:00',
      launches: 6,
      landings: 6,
    }));
    expect(onSaved).toHaveBeenCalledWith(1);
  });
});
