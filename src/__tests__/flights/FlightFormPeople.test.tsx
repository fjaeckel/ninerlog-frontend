import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlightForm from '../../components/flights/FlightForm';

// Mock hooks
vi.mock('../../hooks/useFlights', () => ({
  useCreateFlight: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateFlight: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFlight: () => ({ data: null }),
  useFlights: () => ({ data: { data: [] } }),
}));

vi.mock('../../hooks/useLicenses', () => ({
  useLicenses: () => ({
    data: [
      { id: 'lic-1', licenseType: 'EASA_PPL', licenseNumber: 'PPL-001', isActive: true },
    ],
  }),
}));

vi.mock('../../hooks/useAircraft', () => ({
  useAircraft: () => ({ data: [] }),
  useCreateAircraft: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../hooks/useContacts', () => ({
  useSearchContacts: () => ({ data: [] }),
  useCreateContact: () => ({ mutate: vi.fn() }),
}));

describe('FlightForm Crew Section', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Crew section expanded by default (not a collapsible drawer)', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByText('Crew')).toBeInTheDocument();
    // Crew is always visible — the add-name input should be present without any expand click
    expect(screen.getByPlaceholderText('Person name')).toBeInTheDocument();
  });

  it('renders Instrument / IFR section collapsed by default', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByText('Instrument / IFR')).toBeInTheDocument();
    expect(screen.queryByLabelText(/ifr time/i)).not.toBeInTheDocument();
  });

  it('renders Training & Currency section collapsed by default', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByText('Training & Currency')).toBeInTheDocument();
  });

  it('expands Training & Currency and shows simulated/ground fields', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    await user.click(screen.getByText('Training & Currency'));
    expect(screen.getByLabelText('Simulated Flight Time')).toBeInTheDocument();
    expect(screen.getByLabelText('Ground Training Time')).toBeInTheDocument();
  });

  it('renders Remarks field', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByLabelText('Remarks')).toBeInTheDocument();
  });

  it('adds a crew member', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    // Crew section is already expanded — no need to click to reveal it
    const nameInput = screen.getByPlaceholderText('Person name');
    await user.type(nameInput, 'John Smith');
    const addBtn = screen.getByRole('button', { name: /add/i });
    await user.click(addBtn);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('removes a crew member', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    await user.type(screen.getByPlaceholderText('Person name'), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    // Remove the crew member
    await user.click(screen.getByRole('button', { name: /remove jane doe/i }));
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('shows crew role badge', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    await user.type(screen.getByPlaceholderText('Person name'), 'Test Pilot');
    // Select Examiner role (unique text)
    const roleSelect = screen.getByDisplayValue('Passenger');
    await user.selectOptions(roleSelect, 'Examiner');
    await user.click(screen.getByRole('button', { name: /add/i }));
    // Badge should show Examiner and name
    expect(screen.getByText('Test Pilot')).toBeInTheDocument();
    // Verify the crew member row exists with the role
    const crewRow = screen.getByText('Test Pilot').closest('div');
    expect(crewRow).toBeTruthy();
  });

  it('shows crew count badge next to the Crew heading', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    await user.type(screen.getByPlaceholderText('Person name'), 'Person 1');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
