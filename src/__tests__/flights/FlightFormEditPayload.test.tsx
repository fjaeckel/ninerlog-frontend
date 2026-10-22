import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';
import { formatDuration } from '../../lib/duration';

const onClose = vi.fn();
const update = { mutateAsync: vi.fn(), isPending: false };
const create = { mutateAsync: vi.fn(), isPending: false };

const existing = {
  id: 'flight-1', userId: 'user-1', date: '2026-01-15',
  aircraftReg: 'D-EFGH', aircraftType: 'C172',
  departureIcao: 'EDDF', arrivalIcao: 'EDDH',
  offBlockTime: '14:15:00', onBlockTime: '16:10:00',
  totalTime: 115, isPic: false, isDual: false, picTime: 0, dualTime: 0,
  nightTime: 0, nightTimeOverride: false,
  crossCountryTime: 115, crossCountryTimeOverride: false,
  takeoffsDayOverride: false, takeoffsNightOverride: false,
  ifrTime: 0, landingsDay: 1, landingsNight: 0, allLandings: 1,
  takeoffsDay: 1, takeoffsNight: 0, soloTime: 0, distance: 185.3,
  multiPilotTime: 115, multiPilotTimeOverride: false,
  picName: 'Hendrik Gels', instructorName: 'Anna Imported',
  remarks: 'Old remark', crewMembers: [],
  createdAt: '', updatedAt: '',
};

const renderForm = (flightId?: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FlightForm flightId={flightId} onClose={onClose} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockFlight = (flight: object) =>
  vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: flight, isLoading: false, error: null } as never);

const openTraining = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /training & currency/i }));

const submit = (name: RegExp) =>
  fireEvent.submit(screen.getByRole('button', { name }).closest('form')!);

const sentUpdate = async () => {
  await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(1));
  return update.mutateAsync.mock.calls[0][0].data as Record<string, unknown>;
};

describe('FlightForm edit payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mutateAsync.mockReset().mockResolvedValue({ id: 'flight-1' });
    create.mutateAsync.mockReset().mockResolvedValue({});
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(update as never);
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(create as never);
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({ data: { data: [] } } as never);
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({ data: [] } as never);
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    mockFlight(existing);
  });

  it('sends only the remarks when only the remarks changed', async () => {
    const user = userEvent.setup();
    renderForm('flight-1');
    const remarks = await screen.findByDisplayValue('Old remark');
    await user.clear(remarks);
    await user.type(remarks, 'New remark');
    submit(/update flight/i);

    const data = await sentUpdate();
    expect(data.remarks).toBe('New remark');
    for (const field of ['picName', 'instructorName', 'multiPilotTime', 'aircraftReg', 'aircraftType',
      'departureIcao', 'offBlockTime', 'simulatedFlightTime', 'picusTime', 'launchMethod', 'endorsements']) {
      expect(data).not.toHaveProperty(field);
    }
  });

  it('leaves a derived multi-pilot time empty and shows it as the auto value', async () => {
    const user = userEvent.setup();
    mockFlight({ ...existing, multiPilotTime: 100 });
    renderForm('flight-1');
    await screen.findByDisplayValue('Old remark');
    await openTraining(user);

    expect(screen.getByLabelText(/^multi-pilot time/i)).toHaveValue(null);
    expect(screen.getByText(`Minutes · auto: ${formatDuration(100, 'hm')}`)).toBeInTheDocument();
  });

  it('keeps sending an overridden multi-pilot time', async () => {
    const user = userEvent.setup();
    mockFlight({ ...existing, multiPilotTime: 60, multiPilotTimeOverride: true });
    renderForm('flight-1');
    await screen.findByDisplayValue('Old remark');
    await openTraining(user);
    expect(screen.getByLabelText(/^multi-pilot time/i)).toHaveValue(60);
    submit(/update flight/i);

    expect(await sentUpdate()).toEqual(expect.objectContaining({ multiPilotTime: 60 }));
  });

  it('sends null when an overridden multi-pilot time is cleared', async () => {
    const user = userEvent.setup();
    mockFlight({ ...existing, multiPilotTime: 60, multiPilotTimeOverride: true });
    renderForm('flight-1');
    await screen.findByDisplayValue('Old remark');
    await openTraining(user);
    await user.clear(screen.getByLabelText(/^multi-pilot time/i));
    submit(/update flight/i);

    expect(await sentUpdate()).toEqual(expect.objectContaining({ multiPilotTime: null }));
  });

  it('clears the PIC name when the PIC is removed from the crew', async () => {
    const user = userEvent.setup();
    mockFlight({
      ...existing,
      crewMembers: [{ id: 'cm-1', flightId: 'flight-1', contactId: 'c-1', name: 'Hendrik Gels', role: 'PIC' }],
    });
    renderForm('flight-1');
    await user.click(await screen.findByRole('button', { name: 'Remove Hendrik Gels' }));
    submit(/update flight/i);

    const data = await sentUpdate();
    expect(data).toEqual(expect.objectContaining({ picName: null, crewMembers: [] }));
    expect(data).not.toHaveProperty('instructorName');
  });

  it('sends the PIC name from a crew that carries the role', async () => {
    mockFlight({
      ...existing,
      picName: 'Someone Else',
      crewMembers: [{ id: 'cm-1', flightId: 'flight-1', contactId: 'c-1', name: 'Hendrik Gels', role: 'PIC' }],
    });
    renderForm('flight-1');
    await screen.findByDisplayValue('Old remark');
    submit(/update flight/i);

    expect(await sentUpdate()).toEqual(expect.objectContaining({ picName: 'Hendrik Gels' }));
  });

  describe('create', () => {
    beforeEach(() => {
      vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
      vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
        data: [{ id: 'ac-1', userId: 'user-1', registration: 'D-EFGH', type: 'C172', isActive: true }],
      } as never);
    });

    const fillFlight = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(/aircraft registration/i), 'D-EFGH');
      await user.type(screen.getByLabelText(/departure/i), 'EDDF');
      await user.type(screen.getByLabelText(/arrival/i), 'EDDH');
      await user.clear(screen.getByLabelText(/off-block/i));
      await user.type(screen.getByLabelText(/off-block/i), '1415');
      await user.clear(screen.getByLabelText(/on-block/i));
      await user.type(screen.getByLabelText(/on-block/i), '1610');
      await user.tab();
    };

    it('does not send a multi-pilot time the pilot left empty', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillFlight(user);
      submit(/log flight/i);

      await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledTimes(1));
      expect(create.mutateAsync.mock.calls[0][0]).not.toHaveProperty('multiPilotTime');
    });

    it('sends a multi-pilot time the pilot entered', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillFlight(user);
      await openTraining(user);
      await user.type(screen.getByLabelText(/^multi-pilot time/i), '45');
      submit(/log flight/i);

      await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledTimes(1));
      expect(create.mutateAsync.mock.calls[0][0]).toEqual(expect.objectContaining({ multiPilotTime: 45 }));
    });
  });
});
