import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';
import * as useLicensesHook from '../../hooks/useLicenses';

const onClose = vi.fn();
const update = { mutateAsync: vi.fn(), isPending: false };

const dualFlight = (declared: boolean) => ({
  id: 'flight-1', userId: 'user-1', date: '2026-03-14',
  aircraftReg: 'N734TB', aircraftType: 'C182',
  departureIcao: 'KFDK', arrivalIcao: 'KFDK',
  offBlockTime: '14:00:00', onBlockTime: '15:36:00',
  totalTime: 96, picTime: declared ? 96 : 0, dualTime: 96,
  isPic: declared, isDual: true,
  nightTime: 0, crossCountryTime: 0, ifrTime: 0,
  landingsDay: 3, landingsNight: 0, allLandings: 3,
  takeoffsDay: 3, takeoffsNight: 0, soloTime: 0, distance: 0,
  isFlightReview: true,
  crewMembers: [{ id: 'cm1', flightId: 'flight-1', contactId: null, name: 'Jane Instructor', role: 'Instructor' }],
  remarks: null, createdAt: '', updatedAt: '',
});

const renderForm = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FlightForm flightId="flight-1" onClose={onClose} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockLicences = (authorities: string[] | undefined) =>
  vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
    data: authorities?.map((a, i) => ({ id: `l${i}`, regulatoryAuthority: a })),
  } as never);

const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: /update flight/i }).closest('form')!);

const toggle = () => screen.queryByLabelText(/i was pic/i);

describe('FlightForm — PIC while receiving instruction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mutateAsync.mockReset().mockResolvedValue({ id: 'flight-1' });
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(update as never);
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({ data: { data: [] } } as never);
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({ data: [] } as never);
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('T8: an FAA pilot declares PIC on a flight review with an instructor', async () => {
    const user = userEvent.setup();
    mockLicences(['FAA']);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: dualFlight(false), isLoading: false, error: null } as never);
    renderForm();

    await waitFor(() => expect(toggle()).toBeInTheDocument());
    expect(toggle()).not.toBeChecked();
    await user.click(toggle()!);
    submit();

    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(1));
    expect(update.mutateAsync.mock.calls[0][0].data).toEqual(expect.objectContaining({ isPic: true }));
  });

  it('T8: a declared flight loads checked, shows PIC/Dual, and an untouched save omits isPic', async () => {
    mockLicences(['FAA']);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: dualFlight(true), isLoading: false, error: null } as never);
    renderForm();

    await waitFor(() => expect(toggle()).toBeChecked());
    expect(screen.getByText('PIC/Dual')).toBeInTheDocument();
    submit();

    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(1));
    expect(update.mutateAsync.mock.calls[0][0].data).not.toHaveProperty('isPic');
  });

  it('T8: clearing the toggle sends isPic false', async () => {
    const user = userEvent.setup();
    mockLicences(['FAA']);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: dualFlight(true), isLoading: false, error: null } as never);
    renderForm();

    await waitFor(() => expect(toggle()).toBeChecked());
    await user.click(toggle()!);
    submit();

    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(1));
    expect(update.mutateAsync.mock.calls[0][0].data).toEqual(expect.objectContaining({ isPic: false }));
  });

  it('G1: folds away for an EASA-only pilot and sends no isPic', async () => {
    mockLicences(['EASA']);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: dualFlight(false), isLoading: false, error: null } as never);
    renderForm();

    await waitFor(() => expect(screen.getByLabelText(/instructor comments/i)).toBeInTheDocument());
    expect(toggle()).not.toBeInTheDocument();
    submit();

    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(1));
    expect(update.mutateAsync.mock.calls[0][0].data).not.toHaveProperty('isPic');
  });

  it('data always wins: an EASA-only pilot still sees a flight logged as PIC and dual', async () => {
    mockLicences(['EASA']);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: dualFlight(true), isLoading: false, error: null } as never);
    renderForm();

    await waitFor(() => expect(toggle()).toBeChecked());
  });

  it('fails open while the licences have not loaded', async () => {
    mockLicences(undefined);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: dualFlight(false), isLoading: false, error: null } as never);
    renderForm();

    await waitFor(() => expect(toggle()).toBeInTheDocument());
  });
});
