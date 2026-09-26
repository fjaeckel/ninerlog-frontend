import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';
import * as pilotProfileHook from '../../hooks/usePilotProfile';
import { profileWith } from '../../test/pilotProfile';

const hookResult = <T extends (...args: never[]) => unknown>(_hook: T, value: unknown) => value as ReturnType<T>;

const aircraft = (id: string, registration: string, aircraftClass: string, over: Record<string, unknown> = {}) => ({
  id, userId: 'u1', registration, type: 'X', make: 'M', model: 'N',
  aircraftClass, ulKind: null,
  isComplex: false, isHighPerformance: false, isTailwheel: false, isMultiPilot: false,
  isActive: true, createdAt: '', updatedAt: '',
  ...over,
});

const fleet = [
  aircraft('a1', 'D-1234', 'GLIDER', { type: 'AS21' }),
  aircraft('a2', 'D-KFAL', 'TMG', { type: 'SF25' }),
  aircraft('a3', 'D-MTRK', 'ULTRALIGHT', { ulKind: 'WEIGHT_SHIFT' }),
  aircraft('a4', 'D-AIXX', 'MEP_LAND', { type: 'A320', isMultiPilot: true }),
  aircraft('a5', 'D-EDRA', 'SEP_LAND', { type: 'DR40' }),
];

const storedFlight = (over: Record<string, unknown> = {}) => ({
  id: 'f1', userId: 'u1', date: '2026-08-01',
  aircraftReg: 'D-1234', aircraftType: 'AS21',
  departureIcao: 'EDNY', arrivalIcao: 'EDNY',
  offBlockTime: null, onBlockTime: null, departureTime: '10:05:00', arrivalTime: '10:17:00',
  totalTime: 12, picTime: 12, dualTime: 0, nightTime: 0, crossCountryTime: 0, ifrTime: 0,
  landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1, takeoffsNight: 0,
  soloTime: 0, distance: 0, remarks: null, createdAt: '', updatedAt: '',
  launches: 1, launchesOverride: false, isOutlanding: false, isTowFlight: false, releaseHeightM: null,
  launchMethod: 'winch', crewMembers: [],
  ...over,
});

const PROFILES = {
  lena: profileWith({ SAILPLANE: 'active' }),
  karl: profileWith({ TMG: 'active', SAILPLANE: 'dormant' }),
  petra: profileWith({ SAILPLANE: 'active', AEROPLANE: 'active', INSTRUCTOR: 'active' }),
  sabine: profileWith({ ULTRALIGHT: 'active' }),
  mark: profileWith({ AEROPLANE: 'active', IFR: 'active', MULTI_CREW: 'active', SIMULATOR: 'active' }),
};

const create = vi.fn();
const update = vi.fn();

const asPilot = (who: keyof typeof PROFILES | 'loading') => {
  const disciplines =
    who === 'loading'
      ? pilotProfileHook.resolveDisciplines(undefined, true)
      : pilotProfileHook.resolveDisciplines(PROFILES[who], false);
  vi.spyOn(pilotProfileHook, 'useDisciplines').mockReturnValue(disciplines);
};

const editing = (flight: ReturnType<typeof storedFlight>) =>
  vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue(hookResult(useFlightsHook.useFlight, { data: flight, isLoading: false, error: null }));

const renderForm = (flightId?: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FlightForm flightId={flightId} onClose={vi.fn()} />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

const selectAircraft = async (user: ReturnType<typeof userEvent.setup>, reg: string) => {
  await user.type(screen.getByLabelText(/aircraft registration/i), reg);
};

const clock = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no ${id}`);
  return el as HTMLInputElement;
};

const setClock = (id: string, value: string) => {
  const input = clock(id);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

const before = (a: HTMLElement, b: HTMLElement) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

const moreButton = () => screen.queryByRole('button', { name: /^More \(\d+\)$/ });
const launchMethod = () => screen.queryByRole('combobox', { name: 'Launch Method' });
const lastCreate = () => create.mock.calls[create.mock.calls.length - 1]?.[0] as Record<string, unknown>;
const lastUpdate = () => (update.mock.calls[update.mock.calls.length - 1]?.[0] as { data: Record<string, unknown> }).data;

describe('FlightForm on the relevance registry (phase 3a, WP-20, WP-25)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    create.mockReset().mockResolvedValue({});
    update.mockReset().mockResolvedValue({});
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(hookResult(useFlightsHook.useCreateFlight, { mutateAsync: create, isPending: false }));
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(hookResult(useFlightsHook.useUpdateFlight, { mutateAsync: update, isPending: false }));
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue(hookResult(useFlightsHook.useFlight, { data: undefined, isLoading: false, error: null }));
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue(hookResult(useFlightsHook.useFlights, { data: undefined, isLoading: false, error: null }));
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue(hookResult(useAircraftHook.useAircraft, { data: fleet, isLoading: false, error: null }));
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue(hookResult(useAircraftHook.useCreateAircraft, { mutateAsync: vi.fn(), isPending: false }));
  });

  it('L3: glider form leads with launch method and take-off/landing', async () => {
    const user = userEvent.setup();
    asPilot('lena');
    renderForm();
    await selectAircraft(user, 'D-1234');

    const method = await screen.findByRole('combobox', { name: 'Launch Method' });
    const takeoff = clock('departureTime');
    const landing = clock('arrivalTime');
    expect(before(method, takeoff)).toBe(true);
    expect(before(takeoff, landing)).toBe(true);
    expect(screen.getByLabelText('Launches')).toBeInTheDocument();
    expect(screen.queryByLabelText(/off-block/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Instrument / IFR')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^route$/i)).not.toBeInTheDocument();
    expect(moreButton()).toBeInTheDocument();
  });

  it('L3: the take-off time is prefilled instead of off-block', async () => {
    const user = userEvent.setup();
    asPilot('lena');
    renderForm();
    await selectAircraft(user, 'D-1234');
    await waitFor(() => expect((clock('departureTime') as HTMLInputElement).value).not.toBe(''));
    await user.click(moreButton()!);
    expect((screen.getByLabelText(/off-block/i) as HTMLInputElement).value).toBe('');
  });

  it('K1: TMG has no launch method and take-off/landing first', async () => {
    const user = userEvent.setup();
    asPilot('karl');
    renderForm();
    await selectAircraft(user, 'D-KFAL');

    const takeoff = await waitFor(() => clock('departureTime'));
    expect(launchMethod()).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/off-block/i)).not.toBeInTheDocument();
    expect(before(takeoff, clock('arrivalTime'))).toBe(true);
    expect(screen.getByLabelText('Outlanding')).toBeInTheDocument();
    expect(screen.getByLabelText(/^route$/i)).toBeInTheDocument();
  });

  it('S3: Sabine’s trike form shows no IFR/multi-crew/route unless opened via More', async () => {
    const user = userEvent.setup();
    asPilot('sabine');
    const { container } = renderForm();
    await selectAircraft(user, 'D-MTRK');
    await user.click(screen.getByText('Training & Currency'));

    await waitFor(() => clock('departureTime'));
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/IFR/);
    expect(text).not.toMatch(/block/i);
    expect(screen.queryByLabelText(/multi-pilot/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^picus/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/relief/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^route$/i)).not.toBeInTheDocument();
    expect(launchMethod()).not.toBeInTheDocument();

    await user.click(moreButton()!);
    expect(screen.getByText('Instrument / IFR')).toBeInTheDocument();
    expect(screen.getByLabelText(/^ifr time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^route$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/multi-pilot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/off-block/i)).toBeInTheDocument();
    expect(launchMethod()).toBeInTheDocument();
  });

  it('A1: Mark’s A320 form is unchanged, IFR and multi-crew visible, no glider fields', async () => {
    const user = userEvent.setup();
    asPilot('mark');
    renderForm();
    await selectAircraft(user, 'D-AIXX');

    const offBlock = await screen.findByLabelText(/off-block/i);
    expect(before(offBlock, screen.getByLabelText(/on-block/i))).toBe(true);
    expect(before(screen.getByLabelText(/on-block/i), clock('departureTime'))).toBe(true);
    expect(screen.getByLabelText(/^route$/i)).toBeInTheDocument();
    expect(screen.getByText('Instrument / IFR')).toBeInTheDocument();
    await user.click(screen.getByText('Training & Currency'));
    expect(screen.getByLabelText(/multi-pilot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^picus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relief/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use block time/i })).toBeInTheDocument();

    expect(launchMethod()).not.toBeInTheDocument();
    for (const label of ['Launches', 'Release height (m)', 'Outlanding', 'Tow flight (I flew the tug)']) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/supervised solo/i)).not.toBeInTheDocument();
  });

  it('P1: Petra on the DR400 gets SEP order and the tow flight option', async () => {
    const user = userEvent.setup();
    asPilot('petra');
    renderForm();
    await selectAircraft(user, 'D-EDRA');
    const offBlock = await screen.findByLabelText(/off-block/i);
    expect(before(offBlock, clock('departureTime'))).toBe(true);
    expect(screen.getByLabelText('Tow flight (I flew the tug)')).toBeInTheDocument();
    expect(launchMethod()).not.toBeInTheDocument();
  });

  it('invariant 2: a flight with IFR time opened by Lena shows the IFR section', async () => {
    asPilot('lena');
    editing(storedFlight({ ifrTime: 30 }));
    renderForm('f1');
    expect(await screen.findByText('Instrument / IFR')).toBeInTheDocument();
  });

  it('invariant 2: a glider flight with block times shows them', async () => {
    asPilot('lena');
    editing(storedFlight({ offBlockTime: '10:00:00', onBlockTime: '10:20:00' }));
    renderForm('f1');
    expect(await screen.findByLabelText(/off-block/i)).toBeInTheDocument();
  });

  it('invariant 3: fail-open while the profile loads shows all', async () => {
    asPilot('loading');
    renderForm();
    expect(launchMethod()).toBeInTheDocument();
    expect(screen.getByLabelText(/off-block/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^route$/i)).toBeInTheDocument();
    expect(screen.getByText('Instrument / IFR')).toBeInTheDocument();
    expect(screen.getByLabelText('Outlanding')).toBeInTheDocument();
    expect(screen.getByLabelText('Tow flight (I flew the tug)')).toBeInTheDocument();
    expect(moreButton()).not.toBeInTheDocument();
  });

  it('folded field values are still submitted', async () => {
    const user = userEvent.setup();
    asPilot('lena');
    editing(storedFlight({ route: null, reliefTime: 0 }));
    renderForm('f1');
    await waitFor(() => clock('departureTime'));

    await user.click(moreButton()!);
    await user.type(screen.getByLabelText(/^route$/i), 'EDNY,EDTF');
    await user.click(moreButton()!);
    expect(screen.queryByLabelText(/^route$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update Flight' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(lastUpdate()).toMatchObject({
      route: 'EDNY,EDTF',
      ifrTime: 0,
      reliefTime: 0,
      departureTime: '10:05:00',
      arrivalTime: '10:17:00',
      offBlockTime: null,
      onBlockTime: null,
    });
  });

  describe('time pairs (WP-20)', () => {
    it('K3: take-off and landing alone are valid', async () => {
      const user = userEvent.setup();
      asPilot('karl');
      renderForm();
      await selectAircraft(user, 'D-KFAL');
      await user.type(screen.getByLabelText(/^departure/i), 'EDTF');
      await user.type(screen.getByLabelText(/^arrival/i), 'EDTF');
      setClock('departureTime', '10:00');
      setClock('arrivalTime', '11:10');

      await user.click(screen.getByRole('button', { name: 'Log Flight' }));
      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(lastCreate()).toMatchObject({ departureTime: '10:00:00', arrivalTime: '11:10:00' });
      expect(lastCreate()).not.toHaveProperty('offBlockTime');
      expect(lastCreate()).not.toHaveProperty('onBlockTime');
    });

    it('a lone half is a field error in the API’s wording', async () => {
      const user = userEvent.setup();
      asPilot('karl');
      renderForm();
      await selectAircraft(user, 'D-KFAL');
      await user.type(screen.getByLabelText(/^departure/i), 'EDTF');
      await user.type(screen.getByLabelText(/^arrival/i), 'EDTF');
      setClock('departureTime', '10:00');
      setClock('arrivalTime', '10:40');
      setClock('departureTime', '');

      await user.click(screen.getByRole('button', { name: 'Log Flight' }));
      expect(await screen.findByText(/take-off time is required with a landing time/i)).toBeInTheDocument();
      expect(create).not.toHaveBeenCalled();
    });

    it('A1: block times alone stay valid for Mark', async () => {
      const user = userEvent.setup();
      asPilot('mark');
      renderForm();
      await selectAircraft(user, 'D-AIXX');
      await user.type(screen.getByLabelText(/^departure/i), 'EDDF');
      await user.type(screen.getByLabelText(/^arrival/i), 'EGLL');
      setClock('offBlockTime', '08:00');
      setClock('onBlockTime', '09:40');

      await user.click(screen.getByRole('button', { name: 'Log Flight' }));
      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(lastCreate()).toMatchObject({ offBlockTime: '08:00:00', onBlockTime: '09:40:00' });
      expect(lastCreate()).not.toHaveProperty('departureTime');
      expect(lastCreate()).not.toHaveProperty('launches');
    });

    it('shows an API time-pair 400 on the field', async () => {
      const user = userEvent.setup();
      asPilot('lena');
      editing(storedFlight());
      update.mockRejectedValueOnce({
        error: 'incomplete time pair: departureTime requires arrivalTime; a flight needs offBlockTime and onBlockTime, or departureTime and arrivalTime',
      });
      renderForm('f1');
      await waitFor(() => clock('departureTime'));
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      expect(await screen.findAllByText(/landing time is required with a take-off time/i)).not.toHaveLength(0);
    });

    it('edit mode shows the total from take-off to landing without the word block', async () => {
      asPilot('lena');
      editing(storedFlight());
      renderForm('f1');
      expect(await screen.findByText('Total time')).toBeInTheDocument();
      expect(screen.getByText('Computed from take-off to landing')).toBeInTheDocument();
      expect(screen.queryByText(/total block time/i)).not.toBeInTheDocument();
    });
  });

  describe('launches (WP-23 series entry)', () => {
    it('shows the override and resets it to derived with launches: null', async () => {
      const user = userEvent.setup();
      asPilot('lena');
      editing(storedFlight({ launches: 6, launchesOverride: true }));
      renderForm('f1');

      const input = (await screen.findByLabelText('Launches')) as HTMLInputElement;
      await waitFor(() => expect(input.value).toBe('6'));
      expect(screen.getByText('Entered by you')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Reset to derived' }));
      expect(input.value).toBe('');
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(lastUpdate()).toMatchObject({ launches: null });
    });

    it('shows the derived value and omits launches when not overridden', async () => {
      const user = userEvent.setup();
      asPilot('lena');
      editing(storedFlight({ launches: 1, launchesOverride: false }));
      renderForm('f1');
      expect(await screen.findByText('Derived from the take-offs: 1')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(lastUpdate()).not.toHaveProperty('launches');
    });

    it('L1: a series of launches in one line sends the count', async () => {
      const user = userEvent.setup();
      asPilot('lena');
      editing(storedFlight());
      renderForm('f1');
      const input = await screen.findByLabelText('Launches');
      await user.type(input, '6');
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(lastUpdate()).toMatchObject({ launches: 6 });
    });
  });

  describe('glider flight facts (WP-25)', () => {
    it('outlanding and release height round trip in the payload', async () => {
      const user = userEvent.setup();
      asPilot('lena');
      editing(storedFlight({ launchMethod: 'aerotow' }));
      renderForm('f1');

      const release = await screen.findByLabelText('Release height (m)');
      await user.type(release, '600');
      await user.click(screen.getByLabelText('Outlanding'));
      expect(screen.getByText(/cross-country time is then not derived/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(lastUpdate()).toMatchObject({ isOutlanding: true, isTowFlight: false, releaseHeightM: 600 });
    });

    it('loads stored facts into the form', async () => {
      asPilot('lena');
      editing(storedFlight({ isOutlanding: true, releaseHeightM: 450 }));
      renderForm('f1');
      await waitFor(() => expect(screen.getByLabelText('Outlanding')).toBeChecked());
      expect(screen.getByLabelText('Release height (m)')).toHaveValue(450);
    });

    it('rejects a release height above 20000 m', async () => {
      const user = userEvent.setup();
      asPilot('lena');
      editing(storedFlight());
      renderForm('f1');
      await user.type(await screen.findByLabelText('Release height (m)'), '25000');
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      expect((screen.getByLabelText('Release height (m)') as HTMLInputElement).validity.rangeOverflow).toBe(true);
      expect(update).not.toHaveBeenCalled();
    });

    it('P1: a tow flight on the DR400 sends isTowFlight', async () => {
      const user = userEvent.setup();
      asPilot('petra');
      editing(storedFlight({
        aircraftReg: 'D-EDRA', aircraftType: 'DR40', launchMethod: null,
        offBlockTime: '09:00:00', onBlockTime: '09:20:00',
      }));
      renderForm('f1');
      await user.click(await screen.findByLabelText('Tow flight (I flew the tug)'));
      await user.click(screen.getByRole('button', { name: 'Update Flight' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(lastUpdate()).toMatchObject({ isTowFlight: true, isOutlanding: false, releaseHeightM: null });
    });

    it('labels SPIC as supervised solo for a glider and says it counts toward SFCL.160', async () => {
      const user = userEvent.setup();
      vi.spyOn(pilotProfileHook, 'useDisciplines').mockReturnValue(
        pilotProfileHook.resolveDisciplines(profileWith({ SAILPLANE: 'training' }), false),
      );
      renderForm();
      await selectAircraft(user, 'D-1234');
      await user.click(screen.getByText('Training & Currency'));
      expect(screen.getByLabelText('Supervised solo (SPIC)')).toBeInTheDocument();
      expect(screen.getByText(/counts toward the SFCL\.160 hours/)).toBeInTheDocument();
    });
  });
});
