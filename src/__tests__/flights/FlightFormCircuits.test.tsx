import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import { FlightSavedNotice } from '../../components/flights/FlightSavedNotice';
import { prefillFromFlight } from '../../components/flights/logAnother';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';
import { DISCIPLINES, type PilotProfile } from '../../hooks/usePilotProfile';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const profileState: { profile: PilotProfile | undefined; loading: boolean } = { profile: undefined, loading: true };

vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return { ...actual, useDisciplines: () => actual.resolveDisciplines(profileState.profile, profileState.loading) };
});

const markProfile = (): PilotProfile => ({
  mode: 'adaptive',
  pendingAcknowledgement: [],
  disciplines: DISCIPLINES.map((d) => ({
    discipline: d,
    status: ['AEROPLANE', 'IFR', 'MULTI_CREW', 'SIMULATOR'].includes(d) ? 'active' : 'off',
    intent: 'auto',
    evidence: [],
    ulKinds: [],
  })),
});

const aircraft = (id: string, registration: string, aircraftClass: string, type = 'X') => ({
  id, userId: 'u1', registration, type, make: 'M', model: 'N', aircraftClass, ulKind: null,
  isComplex: false, isHighPerformance: false, isTailwheel: false, isMultiPilot: false,
  isActive: true, createdAt: '', updatedAt: '',
});

const fleet = [
  aircraft('a1', 'D-AIUA', 'MEP_LAND', 'A320'),
  aircraft('a2', 'D-1234', 'GLIDER', 'AS21'),
];

const flight = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1', userId: 'u1', date: '2026-08-08',
  aircraftReg: 'D-1234', aircraftType: 'AS21',
  departureIcao: 'EDLO', arrivalIcao: 'EDLO',
  departureTime: '10:00:00', arrivalTime: '10:08:00',
  totalTime: 8, picTime: 8, dualTime: 0, nightTime: 0, crossCountryTime: 0, ifrTime: 0,
  landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1, takeoffsNight: 0,
  soloTime: 0, distance: 0, remarks: null, createdAt: '', updatedAt: '',
  launchMethod: 'winch',
  instructorName: 'Hanna Reitsch',
  crewMembers: [{ id: 'cm1', flightId: 'f1', contactId: 'c1', name: 'Hanna Reitsch', role: 'Instructor' }],
  ...overrides,
}) as unknown as Flight;

const hookResult = <T extends (...args: never[]) => unknown>(_hook: T, value: unknown) => value as ReturnType<T>;

const renderForm = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
};

const circuitsButton = () => screen.queryByRole('button', { name: 'Circuits' });
const createMutate = vi.fn();

const mockLastFlight = (last: ReturnType<typeof flight> | undefined) => {
  vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue(hookResult(useFlightsHook.useFlights, {
    data: last ? { data: [last], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 } } : undefined,
    isLoading: false, error: null,
  }));
};

describe('FlightForm — circuits entry and log another like this', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileState.profile = undefined;
    profileState.loading = true;
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(hookResult(useFlightsHook.useCreateFlight, { mutateAsync: createMutate, isPending: false }));
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(hookResult(useFlightsHook.useUpdateFlight, { mutateAsync: vi.fn(), isPending: false }));
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue(hookResult(useFlightsHook.useFlight, { data: undefined, isLoading: false, error: null }));
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue(hookResult(useAircraftHook.useAircraft, { data: fleet, isLoading: false, error: null }));
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue(hookResult(useAircraftHook.useCreateAircraft, { mutateAsync: vi.fn(), isPending: false }));
    mockLastFlight(undefined);
  });

  describe('circuits entry', () => {
    it('fail open: shown while the pilot profile is loading', () => {
      renderForm(<FlightForm onClose={vi.fn()} />);
      expect(circuitsButton()).toBeInTheDocument();
    });

    it('A1: hidden for Mark once his profile is loaded', () => {
      profileState.profile = markProfile();
      profileState.loading = false;
      renderForm(<FlightForm onClose={vi.fn()} />);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(circuitsButton()).not.toBeInTheDocument();
      expect(screen.queryByText('Several circuits today?')).not.toBeInTheDocument();
    });

    it('shown whatever the profile when the selected aircraft is a glider', async () => {
      const user = userEvent.setup();
      profileState.profile = markProfile();
      profileState.loading = false;
      renderForm(<FlightForm onClose={vi.fn()} />);
      await user.type(screen.getByLabelText(/aircraft registration/i), 'D-1234');
      expect(await screen.findByRole('button', { name: 'Circuits' })).toBeInTheDocument();
    });

    it('L1: opens circuits mode carrying the aircraft, site and launch method already entered', async () => {
      const user = userEvent.setup();
      mockLastFlight(flight());
      renderForm(<FlightForm onClose={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'Fill' }));
      await user.click(screen.getByRole('button', { name: 'Circuits' }));

      expect(screen.getByTestId('circuits-form')).toBeInTheDocument();
      expect((document.getElementById('circuits-reg') as HTMLInputElement).value).toBe('D-1234');
      expect((document.getElementById('circuits-site') as HTMLInputElement).value).toBe('EDLO');
      expect(screen.getByRole('radio', { name: 'Winch' })).toHaveAttribute('aria-checked', 'true');

      await user.click(screen.getAllByRole('button', { name: 'Single flight' })[0]);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  describe('log another like this', () => {
    it('L1: onSaved hands back the created flight', async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      const created = flight({ id: 'new' });
      createMutate.mockResolvedValue(created);
      mockLastFlight(flight());
      renderForm(<FlightForm onClose={vi.fn()} onSaved={onSaved} />);
      await user.click(screen.getByRole('button', { name: 'Fill' }));
      await user.click(screen.getByRole('button', { name: /save flight|log flight/i }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ count: 1, flight: created }));
    });

    it('L1: the notice offers "Log another like this" for the saved flight', async () => {
      const user = userEvent.setup();
      const onLogAnother = vi.fn();
      const saved = flight();
      render(<FlightSavedNotice saved={{ count: 1, flight: saved }} onLogAnother={onLogAnother} onDismiss={vi.fn()} />);
      expect(screen.getByText('1 flight logged')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Log another like this' }));
      expect(onLogAnother).toHaveBeenCalledWith(saved);
    });

    it('L1: a batch notice reads "6 flights logged" and offers no copy', () => {
      render(<FlightSavedNotice saved={{ count: 6 }} onLogAnother={vi.fn()} onDismiss={vi.fn()} />);
      expect(screen.getByText('6 flights logged')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Log another like this' })).not.toBeInTheDocument();
    });

    it('L1: prefill carries reg, type, crew, launch method and the local site, with times empty', async () => {
      renderForm(<FlightForm onClose={vi.fn()} prefill={prefillFromFlight(flight())} />);

      await waitFor(() => {
        expect((screen.getByLabelText(/aircraft registration/i) as HTMLInputElement).value).toBe('D-1234');
      });
      expect((screen.getByLabelText(/departure/i) as HTMLInputElement).value).toBe('EDLO');
      expect((screen.getByLabelText(/^arrival/i) as HTMLInputElement).value).toBe('EDLO');
      expect((document.getElementById('launchMethod') as HTMLSelectElement).value).toBe('winch');
      expect(screen.getByText('Hanna Reitsch')).toBeInTheDocument();
      for (const id of ['offBlockTime', 'onBlockTime', 'departureTime', 'arrivalTime']) {
        expect((document.getElementById(id) as HTMLInputElement).value).toBe('');
      }
    });

    it('prefill for a cross-country flight keeps its arrival', () => {
      const p = prefillFromFlight(flight({ departureIcao: 'EDLO', arrivalIcao: 'EDKA' }));
      expect(p.values).toMatchObject({ departureIcao: 'EDLO', arrivalIcao: 'EDKA', offBlockTime: '', arrivalTime: '' });
    });

    it('prefill for a flight without arrival treats it as local', () => {
      const p = prefillFromFlight(flight({ arrivalIcao: null }));
      expect(p.values.arrivalIcao).toBe('EDLO');
    });
  });
});
