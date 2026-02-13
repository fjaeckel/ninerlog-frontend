import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AircraftForm from '../../components/aircraft/AircraftForm';
import * as useAircraftHook from '../../hooks/useAircraft';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AircraftForm', () => {
  const mockCreate = { mutateAsync: vi.fn(), isPending: false };
  const mockUpdate = { mutateAsync: vi.fn(), isPending: false };
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue(mockCreate as any);
    vi.spyOn(useAircraftHook, 'useUpdateAircraft').mockReturnValue(mockUpdate as any);
    vi.spyOn(useAircraftHook, 'useAircraftById').mockReturnValue({
      data: undefined, isLoading: false, error: null,
    } as any);
  });

  it('renders all form fields', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^make/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/engine type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complex/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high performance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tailwheel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders engine type options', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    const engineSelect = screen.getByLabelText(/engine type/i);
    expect(engineSelect).toBeInTheDocument();
    expect(screen.getByText('Piston')).toBeInTheDocument();
    expect(screen.getByText('Turboprop')).toBeInTheDocument();
    expect(screen.getByText('Jet')).toBeInTheDocument();
    expect(screen.getByText('Electric')).toBeInTheDocument();
  });

  it('shows add button in create mode', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    expect(screen.getByRole('button', { name: /add aircraft/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    fireEvent.submit(screen.getByRole('button', { name: /add aircraft/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/registration is required/i)).toBeInTheDocument();
    });
  });

  it('submits new aircraft with valid data', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/registration/i), 'D-EFGH');
    await user.type(screen.getByLabelText(/^type/i), 'C172');
    await user.type(screen.getByLabelText(/^make/i), 'Cessna');
    await user.type(screen.getByLabelText(/^model/i), '172 Skyhawk');
    await user.type(screen.getByLabelText(/category/i), 'SEP');
    await user.selectOptions(screen.getByLabelText(/engine type/i), 'piston');

    fireEvent.submit(screen.getByRole('button', { name: /add aircraft/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172 Skyhawk',
          category: 'SEP',
          engineType: 'piston',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('submits aircraft with boolean flags checked', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/registration/i), 'N12345');
    await user.type(screen.getByLabelText(/^type/i), 'PA28R');
    await user.type(screen.getByLabelText(/^make/i), 'Piper');
    await user.type(screen.getByLabelText(/^model/i), 'Arrow');
    await user.click(screen.getByLabelText(/complex/i));
    await user.click(screen.getByLabelText(/high performance/i));

    fireEvent.submit(screen.getByRole('button', { name: /add aircraft/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          registration: 'N12345',
          isComplex: true,
          isHighPerformance: true,
          isTailwheel: false,
        })
      );
    });
  });

  it('populates form when editing existing aircraft', async () => {
    const existingAircraft = {
      id: 'ac-1',
      userId: 'user-1',
      registration: 'D-EFGH',
      type: 'C172',
      make: 'Cessna',
      model: '172 Skyhawk',
      category: 'SEP',
      engineType: 'piston' as const,
      isComplex: false,
      isHighPerformance: false,
      isTailwheel: false,
      isActive: true,
      notes: 'Club aircraft',
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-02-01T14:30:00Z',
    };

    vi.spyOn(useAircraftHook, 'useAircraftById').mockReturnValue({
      data: existingAircraft, isLoading: false, error: null,
    } as any);

    renderWithProviders(<AircraftForm aircraftId="ac-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/registration/i)).toHaveValue('D-EFGH');
      expect(screen.getByLabelText(/^type/i)).toHaveValue('C172');
      expect(screen.getByLabelText(/^make/i)).toHaveValue('Cessna');
      expect(screen.getByLabelText(/^model/i)).toHaveValue('172 Skyhawk');
      expect(screen.getByLabelText(/category/i)).toHaveValue('SEP');
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Club aircraft');
      expect(screen.getByRole('button', { name: /update aircraft/i })).toBeInTheDocument();
    });
  });

  it('shows active toggle only in edit mode', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);
    expect(screen.queryByLabelText(/active in fleet/i)).not.toBeInTheDocument();

    vi.spyOn(useAircraftHook, 'useAircraftById').mockReturnValue({
      data: {
        id: 'ac-1', userId: 'user-1', registration: 'D-EFGH', type: 'C172',
        make: 'Cessna', model: '172', isComplex: false, isHighPerformance: false,
        isTailwheel: false, isActive: true, createdAt: '', updatedAt: '',
      },
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<AircraftForm aircraftId="ac-1" onClose={mockOnClose} />);

    waitFor(() => {
      expect(screen.getByLabelText(/active in fleet/i)).toBeInTheDocument();
    });
  });

  it('submits update for existing aircraft', async () => {
    const user = userEvent.setup();
    mockUpdate.mutateAsync.mockResolvedValueOnce({});

    const existingAircraft = {
      id: 'ac-1',
      userId: 'user-1',
      registration: 'D-EFGH',
      type: 'C172',
      make: 'Cessna',
      model: '172 Skyhawk',
      category: 'SEP',
      engineType: 'piston' as const,
      isComplex: false,
      isHighPerformance: false,
      isTailwheel: false,
      isActive: true,
      notes: null,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-02-01T14:30:00Z',
    };

    vi.spyOn(useAircraftHook, 'useAircraftById').mockReturnValue({
      data: existingAircraft, isLoading: false, error: null,
    } as any);

    renderWithProviders(<AircraftForm aircraftId="ac-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/registration/i)).toHaveValue('D-EFGH');
    });

    await user.clear(screen.getByLabelText(/^model/i));
    await user.type(screen.getByLabelText(/^model/i), '172S Skyhawk SP');
    await user.click(screen.getByLabelText(/complex/i));

    fireEvent.submit(screen.getByRole('button', { name: /update aircraft/i }).closest('form')!);

    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ac-1',
          data: expect.objectContaining({
            registration: 'D-EFGH',
            model: '172S Skyhawk SP',
            isComplex: true,
            isActive: true,
          }),
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
