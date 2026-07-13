import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlightForm from '../../components/flights/FlightForm';

// Aircraft list is swapped per test via this mutable ref.
let mockAircraft: Array<Record<string, unknown>> = [];

vi.mock('../../hooks/useFlights', () => ({
  useCreateFlight: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateFlight: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFlight: () => ({ data: null }),
  useFlights: () => ({ data: { data: [] } }),
}));

vi.mock('../../hooks/useLicenses', () => ({
  useLicenses: () => ({ data: [{ id: 'lic-1', licenseType: 'EASA_SPL', licenseNumber: 'SPL-001', isActive: true }] }),
}));

vi.mock('../../hooks/useAircraft', () => ({
  useAircraft: () => ({ data: mockAircraft }),
  useCreateAircraft: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../hooks/useContacts', () => ({
  useSearchContacts: () => ({ data: [] }),
  useCreateContact: () => ({ mutate: vi.fn() }),
}));

const glider = { id: 'ac-1', registration: 'D-1234', type: 'ASK21', aircraftClass: 'GLIDER', isActive: true };
const sep = { id: 'ac-2', registration: 'D-EFGH', type: 'C172', aircraftClass: 'SEP_LAND', isActive: true };

describe('FlightForm glider mode', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAircraft = [];
  });

  it('hides launch fields for a powered (SEP) aircraft', async () => {
    const user = userEvent.setup();
    mockAircraft = [sep];
    render(<FlightForm onClose={onClose} />);

    await user.type(screen.getByLabelText(/Aircraft Registration/i), 'D-EFGH');

    expect(screen.queryByLabelText('Launches')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Release Altitude/i)).not.toBeInTheDocument();
  });

  it('shows launch method, launches and release altitude for a glider', async () => {
    const user = userEvent.setup();
    mockAircraft = [glider];
    render(<FlightForm onClose={onClose} />);

    await user.type(screen.getByLabelText(/Aircraft Registration/i), 'D-1234');

    expect(screen.getByLabelText('Launches')).toBeInTheDocument();
    expect(screen.getByLabelText(/Release Altitude/i)).toBeInTheDocument();
    // The expanded launch-method dropdown offers the new methods.
    expect(screen.getByRole('option', { name: 'Bungee' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Auto-tow' })).toBeInTheDocument();
  });

  it('hides the IFR field for a pure sailplane', async () => {
    const user = userEvent.setup();
    mockAircraft = [glider];
    render(<FlightForm onClose={onClose} />);

    await user.type(screen.getByLabelText(/Aircraft Registration/i), 'D-1234');
    // Advanced Times holds the IFR field; expand it.
    await user.click(screen.getByText('Advanced Times'));

    expect(screen.queryByLabelText('IFR Time')).not.toBeInTheDocument();
  });
});
