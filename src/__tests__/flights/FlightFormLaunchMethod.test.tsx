import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';
import * as pilotProfileHook from '../../hooks/usePilotProfile';
import { gliderProfile } from '../../test/pilotProfile';

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

const aircraft = (id: string, registration: string, aircraftClass: string | null, ulKind: string | null = null) => ({
  id, userId: 'u1', registration, type: 'X', make: 'M', model: 'N',
  aircraftClass, ulKind,
  isComplex: false, isHighPerformance: false, isTailwheel: false, isMultiPilot: false,
  isActive: true, createdAt: '', updatedAt: '',
});

const fleet = [
  aircraft('a1', 'D-EABC', 'SEP_LAND'),
  aircraft('a2', 'D-5812', 'GLIDER'),
  aircraft('a3', 'D-KFAL', 'TMG'),
  aircraft('a4', 'D-MSEG', 'ULTRALIGHT', 'SAILPLANE'),
  aircraft('a5', 'D-MMOT', 'ULTRALIGHT', 'THREE_AXIS_MOTORGLIDER'),
];

const flight = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1', userId: 'u1', date: '2026-08-01',
  aircraftReg: 'D-5812', aircraftType: 'AS21',
  departureIcao: 'EDNY', arrivalIcao: 'EDNY',
  offBlockTime: '10:00:00', onBlockTime: '10:12:00',
  totalTime: 12, picTime: 12, dualTime: 0, nightTime: 0, crossCountryTime: 0, ifrTime: 0,
  landingsDay: 1, landingsNight: 0, allLandings: 1, takeoffsDay: 1, takeoffsNight: 0,
  soloTime: 0, distance: 0, remarks: null, createdAt: '', updatedAt: '',
  crewMembers: [],
  ...overrides,
});

const hookResult = <T extends (...args: never[]) => unknown>(_hook: T, value: unknown) => value as ReturnType<T>;

const launchMethodGroup = () => screen.queryByRole('combobox', { name: 'Launch Method' });

describe('FlightForm — launch method, fill from last flight, quick-add', () => {
  const mockCreateAircraft = { mutateAsync: vi.fn(), isPending: false };

  const mockLastFlight = (last: ReturnType<typeof flight> | undefined) => {
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue(hookResult(useFlightsHook.useFlights, {
      data: last ? { data: [last], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 } } : undefined,
      isLoading: false, error: null,
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(hookResult(useFlightsHook.useCreateFlight, { mutateAsync: vi.fn(), isPending: false }));
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(hookResult(useFlightsHook.useUpdateFlight, { mutateAsync: vi.fn(), isPending: false }));
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue(hookResult(useFlightsHook.useFlight, { data: undefined, isLoading: false, error: null }));
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue(hookResult(useAircraftHook.useAircraft, { data: fleet, isLoading: false, error: null }));
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue(hookResult(useAircraftHook.useCreateAircraft, mockCreateAircraft));
    mockLastFlight(undefined);
    vi.spyOn(pilotProfileHook, 'useDisciplines').mockReturnValue(pilotProfileHook.resolveDisciplines(gliderProfile(), false));
  });

  describe('launch method', () => {
    it.each([
      ['L3: glider shows launch method', 'D-5812', true],
      ['UL sailplane shows launch method', 'D-MSEG', true],
      ['K1: TMG hides launch method', 'D-KFAL', false],
      ['UL motorglider hides launch method', 'D-MMOT', false],
      ['A1: SEP aircraft shows no launch method', 'D-EABC', false],
    ])('%s', async (_name, reg, shown) => {
      const user = userEvent.setup();
      renderWithProviders(<FlightForm onClose={vi.fn()} />);
      await user.type(screen.getByLabelText(/aircraft registration/i), reg);
      if (shown) {
        expect(await screen.findByRole('combobox', { name: 'Launch Method' })).toBeInTheDocument();
        expect(screen.getByText(/launches are counted per method/i)).toBeInTheDocument();
      } else {
        expect(launchMethodGroup()).not.toBeInTheDocument();
      }
    });

    it('A1: an edited flight with a stored launch method shows it whatever the aircraft', async () => {
      vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue(hookResult(useFlightsHook.useFlight, {
        data: flight({ aircraftReg: 'D-EABC', aircraftType: 'C172', launchMethod: 'winch' }),
        isLoading: false, error: null,
      }));
      renderWithProviders(<FlightForm flightId="f1" onClose={vi.fn()} />);

      expect(await screen.findByRole('combobox', { name: 'Launch Method' })).toBeInTheDocument();
      await waitFor(() => {
        expect((document.getElementById('launchMethod') as HTMLSelectElement).value).toBe('winch');
      });
    });
  });

  describe('fill from last flight', () => {
    it('L3: copies launch method, crew and the local airfield', async () => {
      const user = userEvent.setup();
      mockLastFlight(flight({
        launchMethod: 'winch',
        instructorName: 'Hanna Reitsch',
        crewMembers: [{ id: 'cm1', flightId: 'f1', contactId: 'c1', name: 'Hanna Reitsch', role: 'Instructor' }],
      }));
      renderWithProviders(<FlightForm onClose={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Fill' }));

      expect((screen.getByLabelText(/aircraft registration/i) as HTMLInputElement).value).toBe('D-5812');
      expect((screen.getByLabelText(/departure/i) as HTMLInputElement).value).toBe('EDNY');
      expect((screen.getByLabelText(/arrival/i) as HTMLInputElement).value).toBe('EDNY');
      expect(await screen.findByRole('combobox', { name: 'Launch Method' })).toBeInTheDocument();
      expect((document.getElementById('launchMethod') as HTMLSelectElement).value).toBe('winch');
      expect(screen.getAllByText('Hanna Reitsch').length).toBeGreaterThan(0);
    });

    it('keeps continuing from the last arrival for a cross-country flight', async () => {
      const user = userEvent.setup();
      mockLastFlight(flight({ aircraftReg: 'D-EABC', aircraftType: 'C172', departureIcao: 'EDDF', arrivalIcao: 'EDDH' }));
      renderWithProviders(<FlightForm onClose={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Fill' }));

      expect((screen.getByLabelText(/departure/i) as HTMLInputElement).value).toBe('EDDH');
      expect((screen.getByLabelText(/arrival/i) as HTMLInputElement).value).toBe('');
      expect(launchMethodGroup()).not.toBeInTheDocument();
    });
  });

  describe('quick-add aircraft', () => {
    const openQuickAdd = async (user: ReturnType<typeof userEvent.setup>, reg: string) => {
      await user.type(screen.getByLabelText(/aircraft registration/i), reg);
      await user.click(await screen.findByText(/new aircraft\? save/i));
      await user.type(screen.getByPlaceholderText(/type/i), 'AS21');
      await user.type(screen.getByPlaceholderText(/make/i), 'Schleicher');
      await user.type(screen.getByPlaceholderText(/model/i), 'ASK 21');
    };

    it('requires a class when the registration implies none', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FlightForm onClose={vi.fn()} />);
      await openQuickAdd(user, 'D-KNEW');

      const cls = screen.getByLabelText(/aircraft class/i) as HTMLSelectElement;
      expect(cls.value).toBe('');
      expect(screen.getByRole('button', { name: /save aircraft/i })).toBeDisabled();

      await user.selectOptions(cls, 'TMG');
      expect(screen.getByRole('button', { name: /save aircraft/i })).toBeEnabled();
    });

    it('L3: prefills GLIDER for a D-#### registration and saves it', async () => {
      const user = userEvent.setup();
      mockCreateAircraft.mutateAsync.mockResolvedValueOnce({});
      renderWithProviders(<FlightForm onClose={vi.fn()} />);
      await openQuickAdd(user, 'D-1234');

      expect((screen.getByLabelText(/aircraft class/i) as HTMLSelectElement).value).toBe('GLIDER');
      expect(screen.getByText(/suggested from the registration/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /save aircraft/i }));

      await waitFor(() => {
        expect(mockCreateAircraft.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ registration: 'D-1234', aircraftClass: 'GLIDER', ulKind: null }),
        );
      });
    });

    it('M3: quick-added D-M… is ULTRALIGHT and requires the UL kind', async () => {
      const user = userEvent.setup();
      mockCreateAircraft.mutateAsync.mockResolvedValueOnce({});
      renderWithProviders(<FlightForm onClose={vi.fn()} />);
      await openQuickAdd(user, 'D-MNEW');

      expect((screen.getByLabelText(/aircraft class/i) as HTMLSelectElement).value).toBe('ULTRALIGHT');
      const save = screen.getByRole('button', { name: /save aircraft/i });
      expect(save).toBeDisabled();

      await user.selectOptions(screen.getByLabelText(/ultralight kind/i), 'THREE_AXIS');
      expect(save).toBeEnabled();
      await user.click(save);

      await waitFor(() => {
        expect(mockCreateAircraft.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ registration: 'D-MNEW', aircraftClass: 'ULTRALIGHT', ulKind: 'THREE_AXIS' }),
        );
      });
    });
  });
});
