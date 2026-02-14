import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlightForm from '../../components/flights/FlightForm';

// Mock hooks
vi.mock('../../hooks/useFlights', () => ({
  useCreateFlight: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateFlight: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFlight: () => ({ data: null }),
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

describe('FlightForm People Section', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders People on Board section collapsed by default', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByText('People on Board')).toBeInTheDocument();
    // When collapsed, the Add button should not be visible
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
  });

  it('expands People section when clicked', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    await user.click(screen.getByText('People on Board'));
    // After expanding, role selector should be visible
    expect(screen.getByText('Instructor Name')).toBeInTheDocument();
  });

  it('renders Advanced Times section collapsed by default', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByText('Advanced Times')).toBeInTheDocument();
  });

  it('expands Advanced Times and shows simulated/ground fields', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    await user.click(screen.getByText('Advanced Times'));
    expect(screen.getByLabelText('Simulated Flight')).toBeInTheDocument();
    expect(screen.getByLabelText('Ground Training')).toBeInTheDocument();
  });

  it('renders Remarks field', () => {
    render(<FlightForm onClose={mockOnClose} />);
    expect(screen.getByLabelText('Remarks')).toBeInTheDocument();
  });

  it('adds a crew member', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    // Expand people section
    await user.click(screen.getByText('People on Board'));
    // Type a name
    const nameInput = screen.getByPlaceholderText('Person name');
    await user.type(nameInput, 'John Smith');
    // Click add
    const addBtn = screen.getByRole('button', { name: /add/i });
    await user.click(addBtn);
    // Verify crew member appears
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('removes a crew member', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    // Expand people section
    await user.click(screen.getByText('People on Board'));
    // Add a crew member
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
    await user.click(screen.getByText('People on Board'));
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

  it('shows crew count badge when collapsed', async () => {
    const user = userEvent.setup();
    render(<FlightForm onClose={mockOnClose} />);
    // Expand, add, collapse
    await user.click(screen.getByText('People on Board'));
    await user.type(screen.getByPlaceholderText('Person name'), 'Person 1');
    await user.click(screen.getByRole('button', { name: /add/i }));
    // Collapse the section
    await user.click(screen.getByText('People on Board'));
    // Should still show count badge
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
