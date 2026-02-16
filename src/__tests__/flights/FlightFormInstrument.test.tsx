import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';

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

describe('FlightForm Instrument Tracking', () => {
  const mockCreate = { mutateAsync: vi.fn(), isPending: false };
  const mockUpdate = { mutateAsync: vi.fn(), isPending: false };
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(mockCreate as any);
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(mockUpdate as any);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({
      data: undefined, isLoading: false, error: null,
    } as any);
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue({
      mutateAsync: vi.fn(), isPending: false,
    } as any);
  });

  it('renders instrument tracking fields when advanced section is expanded', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    // Expand advanced section
    await user.click(screen.getByText('Advanced Times'));

    expect(screen.getByLabelText(/actual instrument/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/simulated instrument/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/approaches/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/holds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/instrument proficiency check/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/flight review/i)).toBeInTheDocument();
  });

  it('does not show instrument fields when advanced section is collapsed', () => {
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    expect(screen.queryByLabelText(/actual instrument/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/simulated instrument/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/approaches/i)).not.toBeInTheDocument();
  });

  it('submits instrument tracking data with flight', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    // Provide a matching aircraft so aircraftType gets auto-filled
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [{ id: 'ac-1', registration: 'D-EFGH', type: 'C172', make: 'Cessna', model: 'Skyhawk', isActive: true }],
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/aircraft registration/i), 'D-EFGH');
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-02-15' } });
    await user.type(screen.getByLabelText(/departure icao/i), 'EDDF');
    await user.type(screen.getByLabelText(/arrival icao/i), 'EDDH');
    fireEvent.change(screen.getByLabelText(/off-block/i), { target: { value: '14:15' } });
    fireEvent.change(screen.getByLabelText('Takeoff'), { target: { value: '14:30' } });
    fireEvent.change(screen.getByLabelText('Landing'), { target: { value: '16:45' } });
    fireEvent.change(screen.getByLabelText(/on-block/i), { target: { value: '16:55' } });

    // Expand advanced section and fill instrument fields
    await user.click(screen.getByText('Advanced Times'));

    fireEvent.change(screen.getByLabelText(/actual instrument/i), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText(/simulated instrument/i), { target: { value: '0.3' } });
    fireEvent.change(screen.getByLabelText(/approaches/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/holds/i), { target: { value: '1' } });
    await user.click(screen.getByLabelText(/instrument proficiency check/i));
    await user.click(screen.getByLabelText(/flight review/i));

    fireEvent.submit(screen.getByRole('button', { name: /log flight/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          actualInstrumentTime: 0.5,
          simulatedInstrumentTime: 0.3,
          approachesCount: 2,
          holds: 1,
          isIpc: true,
          isFlightReview: true,
        })
      );
    });
  });

  it('populates instrument fields in edit mode', async () => {
    const user = userEvent.setup();
    const existingFlight = {
      id: 'flight-1',
      userId: 'user-1',
      date: '2026-02-10',
      aircraftReg: 'D-EFGH',
      aircraftType: 'C172',
      departureIcao: 'EDDF',
      arrivalIcao: 'EDDH',
      offBlockTime: '14:15:00',
      onBlockTime: '16:55:00',
      departureTime: '14:30:00',
      arrivalTime: '16:45:00',
      totalTime: 2.7,
      isPic: true,
      isDual: false,
      picTime: 2.7,
      dualTime: 0,
      nightTime: 0,
      ifrTime: 0.8,
      soloTime: 2.7,
      crossCountryTime: 2.7,
      distance: 185,
      landingsDay: 1,
      landingsNight: 0,
      allLandings: 1,
      takeoffsDay: 1,
      takeoffsNight: 0,
      actualInstrumentTime: 0.5,
      simulatedInstrumentTime: 0.3,
      holds: 1,
      approachesCount: 2,
      isIpc: true,
      isFlightReview: false,
      remarks: null,
      createdAt: '2026-02-10T00:00:00Z',
      updatedAt: '2026-02-10T00:00:00Z',
    };

    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({
      data: existingFlight, isLoading: false, error: null,
    } as any);

    renderWithProviders(<FlightForm flightId="flight-1" onClose={mockOnClose} />);

    // Expand advanced section
    await user.click(screen.getByText('Advanced Times'));

    await waitFor(() => {
      expect(screen.getByLabelText(/actual instrument/i)).toHaveValue(0.5);
      expect(screen.getByLabelText(/simulated instrument/i)).toHaveValue(0.3);
      expect(screen.getByLabelText(/approaches/i)).toHaveValue(2);
      expect(screen.getByLabelText(/holds/i)).toHaveValue(1);
      expect(screen.getByLabelText(/instrument proficiency check/i)).toBeChecked();
      expect(screen.getByLabelText(/flight review/i)).not.toBeChecked();
    });
  });

  it('defaults instrument fields to zero/false for new flights', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlightForm onClose={mockOnClose} />);

    await user.click(screen.getByText('Advanced Times'));

    expect(screen.getByLabelText(/actual instrument/i)).toHaveValue(0);
    expect(screen.getByLabelText(/simulated instrument/i)).toHaveValue(0);
    expect(screen.getByLabelText(/approaches/i)).toHaveValue(0);
    expect(screen.getByLabelText(/holds/i)).toHaveValue(0);
    expect(screen.getByLabelText(/instrument proficiency check/i)).not.toBeChecked();
    expect(screen.getByLabelText(/flight review/i)).not.toBeChecked();
  });
});
