import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
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
    expect(screen.getByLabelText(/aircraft class/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/complex/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high performance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tailwheel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders aircraft class options', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    const classSelect = screen.getByLabelText(/aircraft class/i);
    expect(classSelect).toBeInTheDocument();
    expect(screen.getByText(/SEP \(Land\)/)).toBeInTheDocument();
    expect(screen.getByText(/MEP \(Land\)/)).toBeInTheDocument();
    expect(screen.getByText(/TMG/)).toBeInTheDocument();
  });

  it('offers glider and ultralight as standard classes', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    expect(screen.getByRole('option', { name: /^glider/i })).toHaveValue('GLIDER');
    expect(screen.getByRole('option', { name: /^ultralight/i })).toHaveValue('ULTRALIGHT');
  });

  it('asks for the ultralight kind only for an ULTRALIGHT class', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    expect(screen.queryByLabelText(/ultralight kind/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/aircraft class/i), 'ULTRALIGHT');
    const kind = screen.getByLabelText(/ultralight kind/i);
    expect(screen.getByRole('option', { name: 'Three-axis UL motorglider (TMG)' })).toHaveValue('THREE_AXIS_MOTORGLIDER');
    await user.selectOptions(kind, 'THREE_AXIS');
    await user.selectOptions(screen.getByLabelText(/aircraft class/i), 'SEP_LAND');
    expect(screen.queryByLabelText(/ultralight kind/i)).not.toBeInTheDocument();
  });

  it('sends the ultralight kind with an ULTRALIGHT aircraft and clears it otherwise', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValue({});
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/registration/i), 'D-MIKA');
    await user.type(screen.getByLabelText(/^type/i), 'C42');
    await user.type(screen.getByLabelText(/^make/i), 'Ikarus');
    await user.type(screen.getByLabelText(/^model/i), 'C42 B');
    await user.selectOptions(screen.getByLabelText(/aircraft class/i), 'ULTRALIGHT');
    await user.selectOptions(screen.getByLabelText(/ultralight kind/i), 'THREE_AXIS');
    await user.click(screen.getByRole('button', { name: /add aircraft/i }));

    await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalled());
    expect(mockCreate.mutateAsync.mock.calls[0][0]).toMatchObject({ aircraftClass: 'ULTRALIGHT', ulKind: 'THREE_AXIS' });
  });

  it('asks for the maximum take-off mass of an ultralight gyroplane only', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValue({});
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/registration/i), 'D-MGYR');
    await user.type(screen.getByLabelText(/^type/i), 'MTO');
    await user.type(screen.getByLabelText(/^make/i), 'AutoGyro');
    await user.type(screen.getByLabelText(/^model/i), 'MTOsport');
    await user.selectOptions(screen.getByLabelText(/aircraft class/i), 'ULTRALIGHT');
    await user.selectOptions(screen.getByLabelText(/ultralight kind/i), 'THREE_AXIS');
    expect(screen.queryByLabelText(/maximum take-off mass/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/ultralight kind/i), 'GYROPLANE');
    await user.type(screen.getByLabelText(/maximum take-off mass/i), '472');
    await user.click(screen.getByRole('button', { name: /add aircraft/i }));

    await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalled());
    expect(mockCreate.mutateAsync.mock.calls[0][0]).toMatchObject({ ulKind: 'GYROPLANE', maxTakeoffMassKg: 472 });
  });

  it('offers the gyroplane class', () => {
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);
    expect(screen.getByRole('option', { name: /^gyroplane/i })).toHaveValue('GYROPLANE');
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
    await user.selectOptions(screen.getByLabelText(/aircraft class/i), 'SEP_LAND');

    fireEvent.submit(screen.getByRole('button', { name: /add aircraft/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172 Skyhawk',
          aircraftClass: 'SEP_LAND',
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
      aircraftClass: 'SEP_LAND',
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
      aircraftClass: 'SEP_LAND',
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
  it('S2 Sabine: a powered paraglider asks for a name or registration and accepts PPG-Viper', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValue({});
    renderWithProviders(<AircraftForm onClose={mockOnClose} />);

    expect(screen.getByText('Registration')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/aircraft class/i), 'ULTRALIGHT');
    await user.selectOptions(screen.getByLabelText(/ultralight kind/i), 'POWERED_PARAGLIDER');
    const field = screen.getByLabelText(/name or registration/i);
    expect(field).toHaveAttribute('placeholder', 'PPG-Viper');
    expect(screen.getByText('Powered paragliders have no registration — use a name, e.g. PPG-Viper.')).toBeInTheDocument();
    expect(field).toHaveAccessibleDescription(/use a name/);

    await user.type(field, 'PPG-Viper');
    await user.type(screen.getByLabelText(/^type/i), 'PPG');
    await user.type(screen.getByLabelText(/^make/i), 'Ozone');
    await user.type(screen.getByLabelText(/^model/i), 'Viper 5');
    await user.click(screen.getByRole('button', { name: /add aircraft/i }));
    await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalled());
    expect(mockCreate.mutateAsync.mock.calls[0][0]).toMatchObject({ registration: 'PPG-Viper', ulKind: 'POWERED_PARAGLIDER' });

    await user.selectOptions(screen.getByLabelText(/ultralight kind/i), 'WEIGHT_SHIFT');
    expect(screen.queryByText(/use a name/)).not.toBeInTheDocument();
  });
});
