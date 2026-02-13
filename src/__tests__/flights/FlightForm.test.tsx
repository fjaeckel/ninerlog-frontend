import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';
import * as useAircraftHook from '../../hooks/useAircraft';
import { useLicenseStore } from '../../stores/licenseStore';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockLicense = {
  id: 'lic-1',
  userId: 'user-1',
  licenseType: 'EASA_PPL' as const,
  licenseNumber: 'PPL-12345',
  issuingAuthority: 'EASA',
  issueDate: '2024-01-01',
  expiryDate: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('FlightForm', () => {
  const mockCreate = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockUpdate = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(mockCreate as any);
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(mockUpdate as any);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [mockLicense],
      isLoading: false,
      error: null,
    } as any);
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    useLicenseStore.setState({ activeLicense: mockLicense });
  });

  it('renders all form sections', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Route & Times (UTC)')).toBeInTheDocument();
    expect(screen.getByText('Block Times')).toBeInTheDocument();
    expect(screen.getByText('Takeoffs & Landings')).toBeInTheDocument();
  });

  it('renders basic form fields', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/license/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aircraft registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aircraft type/i)).toBeInTheDocument();
  });

  it('renders route and time fields including block times', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/departure icao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/arrival icao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/off-block/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Takeoff *')).toBeInTheDocument();
    expect(screen.getByLabelText('Landing *')).toBeInTheDocument();
    expect(screen.getByLabelText(/on-block/i)).toBeInTheDocument();
  });

  it('renders time fields', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/pic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/night time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ifr time/i)).toBeInTheDocument();
  });

  it('renders landing fields', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/day landings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/night landings/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    // Clear the date field (it has a default)
    const dateInput = screen.getByLabelText(/^date/i);
    await user.clear(dateInput);

    await user.click(screen.getByRole('button', { name: /log flight/i }));

    await waitFor(() => {
      expect(screen.getByText(/aircraft registration is required/i)).toBeInTheDocument();
    });
  });

  it('submits new flight with valid data', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    // Use pure userEvent (matching working LicenseForm test pattern)
    await user.selectOptions(screen.getByLabelText(/license/i), 'lic-1');
    await user.clear(screen.getByLabelText(/^date/i));
    await user.type(screen.getByLabelText(/^date/i), '2026-01-15');
    await user.type(screen.getByLabelText(/aircraft registration/i), 'D-EFGH');
    await user.type(screen.getByLabelText(/aircraft type/i), 'C172');
    await user.type(screen.getByLabelText(/departure icao/i), 'EDDF');
    await user.type(screen.getByLabelText(/arrival icao/i), 'EDDH');
    // Fill required time fields via fireEvent (time inputs)
    fireEvent.change(screen.getByLabelText(/off-block/i), { target: { value: '14:15' } });
    fireEvent.change(screen.getByLabelText('Takeoff *'), { target: { value: '14:30' } });
    fireEvent.change(screen.getByLabelText('Landing *'), { target: { value: '16:00' } });
    fireEvent.change(screen.getByLabelText(/on-block/i), { target: { value: '16:10' } });

    // Submit via form submit event directly
    fireEvent.submit(screen.getByRole('button', { name: /log flight/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          licenseId: 'lic-1',
          aircraftReg: 'D-EFGH',
          aircraftType: 'C172',
          departureIcao: 'EDDF',
          arrivalIcao: 'EDDH',
          offBlockTime: '14:15:00',
          onBlockTime: '16:10:00',
          departureTime: '14:30:00',
          arrivalTime: '16:00:00',
          isPic: true,
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('uppercases aircraft registration and type', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    await user.selectOptions(screen.getByLabelText(/license/i), 'lic-1');
    await user.clear(screen.getByLabelText(/^date/i));
    await user.type(screen.getByLabelText(/^date/i), '2026-01-15');
    await user.type(screen.getByLabelText(/aircraft registration/i), 'd-efgh');
    await user.type(screen.getByLabelText(/aircraft type/i), 'c172');
    await user.type(screen.getByLabelText(/departure icao/i), 'eddf');
    await user.type(screen.getByLabelText(/arrival icao/i), 'eddh');
    fireEvent.change(screen.getByLabelText(/off-block/i), { target: { value: '14:15' } });
    fireEvent.change(screen.getByLabelText('Takeoff *'), { target: { value: '14:30' } });
    fireEvent.change(screen.getByLabelText('Landing *'), { target: { value: '16:00' } });
    fireEvent.change(screen.getByLabelText(/on-block/i), { target: { value: '16:10' } });

    fireEvent.submit(screen.getByRole('button', { name: /log flight/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          aircraftReg: 'D-EFGH',
          aircraftType: 'C172',
          departureIcao: 'EDDF',
          arrivalIcao: 'EDDH',
        })
      );
    });
  });

  it('populates form when editing existing flight', async () => {
    const existingFlight = {
      id: 'flight-1',
      userId: 'user-1',
      licenseId: 'lic-1',
      date: '2026-01-15',
      aircraftReg: 'D-EFGH',
      aircraftType: 'C172',
      departureIcao: 'EDDF',
      arrivalIcao: 'EDDH',
      departureTime: '14:30:00',
      arrivalTime: '16:00:00',
      offBlockTime: '14:15:00',
      onBlockTime: '16:10:00',
      totalTime: 1.5,
      isPic: true,
      isDual: false,
      picTime: 1.5,
      dualTime: 0,
      nightTime: 0,
      ifrTime: 0,
      landingsDay: 2,
      landingsNight: 0,
      allLandings: 2,
      takeoffsDay: 2,
      takeoffsNight: 0,
      soloTime: 1.5,
      crossCountryTime: 1.5,
      distance: 185.3,
      remarks: 'Training flight',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    };

    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({
      data: existingFlight,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<FlightForm flightId="flight-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/aircraft registration/i)).toHaveValue('D-EFGH');
      expect(screen.getByLabelText(/aircraft type/i)).toHaveValue('C172');
      expect(screen.getByRole('button', { name: /update flight/i })).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('hides night time and night landings for SPL license', () => {
    const splLicense = {
      ...mockLicense,
      id: 'lic-spl',
      licenseType: 'EASA_SPL' as const,
      licenseNumber: 'SPL-12345',
    };

    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [splLicense],
      isLoading: false,
      error: null,
    } as any);
    useLicenseStore.setState({ activeLicense: splLicense });

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.queryByLabelText(/night time/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/night landings/i)).not.toBeInTheDocument();
  });

  it('shows night time and night landings for PPL license', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/night time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/night landings/i)).toBeInTheDocument();
  });

  it('shows aircraft autocomplete suggestions when typing registration', async () => {
    const user = userEvent.setup();
    const mockAircraft = [
      {
        id: 'ac-1', userId: 'user-1', registration: 'D-EFGH', type: 'C172',
        make: 'Cessna', model: '172 Skyhawk', isComplex: false, isHighPerformance: false,
        isTailwheel: false, isActive: true, notes: null, createdAt: '', updatedAt: '',
      },
      {
        id: 'ac-2', userId: 'user-1', registration: 'D-ABCD', type: 'PA28',
        make: 'Piper', model: 'Cherokee', isComplex: false, isHighPerformance: false,
        isTailwheel: false, isActive: true, notes: null, createdAt: '', updatedAt: '',
      },
    ];
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: mockAircraft, isLoading: false, error: null,
    } as any);

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    const regInput = screen.getByLabelText(/aircraft registration/i);
    await user.type(regInput, 'D-E');

    await waitFor(() => {
      expect(screen.getByText('D-EFGH')).toBeInTheDocument();
    });
  });

  it('auto-fills aircraft type when selecting from suggestions', async () => {
    const user = userEvent.setup();
    const mockAircraft = [
      {
        id: 'ac-1', userId: 'user-1', registration: 'D-EFGH', type: 'C172',
        make: 'Cessna', model: '172 Skyhawk', isComplex: false, isHighPerformance: false,
        isTailwheel: false, isActive: true, notes: null, createdAt: '', updatedAt: '',
      },
    ];
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: mockAircraft, isLoading: false, error: null,
    } as any);

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    const regInput = screen.getByLabelText(/aircraft registration/i);
    await user.type(regInput, 'D-E');

    await waitFor(() => {
      expect(screen.getByText('D-EFGH')).toBeInTheDocument();
    });

    await user.click(screen.getByText('D-EFGH'));

    await waitFor(() => {
      expect(screen.getByLabelText(/aircraft registration/i)).toHaveValue('D-EFGH');
      expect(screen.getByLabelText(/aircraft type/i)).toHaveValue('C172');
    });
  });

  it('shows quick-add prompt for unrecognized registration', async () => {
    const user = userEvent.setup();
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/aircraft registration/i), 'N12345');

    await waitFor(() => {
      expect(screen.getByText(/new aircraft\? save/i)).toBeInTheDocument();
    });
  });

  it('quick-adds aircraft to fleet from flight form', async () => {
    const user = userEvent.setup();
    const mockCreateAircraft = { mutateAsync: vi.fn().mockResolvedValueOnce({}), isPending: false };
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue(mockCreateAircraft as any);

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/aircraft registration/i), 'N12345');
    await user.type(screen.getByLabelText(/aircraft type/i), 'C152');

    await waitFor(() => {
      expect(screen.getByText(/new aircraft\? save/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/new aircraft\? save/i));

    // Quick-add form should appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/make/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/model/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/make/i), 'Cessna');
    await user.type(screen.getByPlaceholderText(/model/i), '152');
    await user.click(screen.getByRole('button', { name: /save aircraft/i }));

    await waitFor(() => {
      expect(mockCreateAircraft.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          registration: 'N12345',
          type: 'C152',
          make: 'Cessna',
          model: '152',
        })
      );
    });
  });
});
