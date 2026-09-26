import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../../pages/DashboardPage';
import CurrencyPage from '../../pages/currency/CurrencyPage';
import AircraftForm from '../../components/aircraft/AircraftForm';
import { ClassOptions } from '../../components/relevance';
import * as flightsHook from '../../hooks/useFlights';
import * as statsHook from '../../hooks/useStatistics';
import * as currencyHook from '../../hooks/useCurrency';
import * as credentialsHook from '../../hooks/useCredentials';
import * as classStatsHook from '../../hooks/useStatsByClass';
import * as trendsHook from '../../hooks/useTrends';
import * as aircraftHook from '../../hooks/useAircraft';
import * as remindersHook from '../../hooks/useAircraftReminders';
import * as customCurrencyHook from '../../hooks/useCustomCurrency';
import * as licensesHook from '../../hooks/useLicenses';
import { useAuthStore } from '../../stores/authStore';
import { PERSONA_PROFILES } from '../../test/pilotProfile';
import type { PilotProfile } from '../../hooks/usePilotProfile';

vi.mock('../../hooks/useSoaringSeason', () => ({ useSoaringSeason: () => ({ data: undefined, isLoading: false, isError: false }) }));

const renderPage = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );

const profileState = vi.hoisted(() => ({ profile: undefined as unknown, isLoading: true }));

vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return {
    ...actual,
    useDisciplines: () => actual.resolveDisciplines(profileState.profile as PilotProfile | undefined, profileState.isLoading),
  };
});

const asProfile = (profile: PilotProfile | undefined, isLoading = false) => {
  profileState.profile = profile;
  profileState.isLoading = isLoading;
};

const stats = (over: Record<string, number> = {}) => ({
  totalFlights: 20, totalMinutes: 1200, picMinutes: 1100, dualMinutes: 100, soloMinutes: 0,
  crossCountryMinutes: 300, nightMinutes: 0, ifrMinutes: 0, landingsDay: 20, landingsNight: 0,
  sicMinutes: 0, picusMinutes: 0, spicMinutes: 0, reliefMinutes: 0, examinerMinutes: 0,
  ...over,
});

const rating = (id: string, classType: string, licenseId: string, status = 'current', licenseType = 'SPL') => ({
  classRatingId: id, classType, licenseId, regulatoryAuthority: 'EASA', licenseType, status,
  messageKey: status === 'expired' ? 'rating.expired' : 'rating.revalidation_current', requirements: [],
});

const byType = (types: string[]) => ({
  byType: new Map(types.map((t) => [t, {
    aircraftType: t, totalMinutes: 100, totalFlights: 5, landingsDay: 5, landingsNight: 0,
    landingsLast90Days: 1, lastFlightDate: '2026-08-01', recencyLapsesOn: null,
  }])),
  byReg: new Map(),
});

function mockCommon(statistics: ReturnType<typeof stats>, ratings: ReturnType<typeof rating>[], aircraftTypes: string[] = []) {
  vi.spyOn(flightsHook, 'useFlights').mockReturnValue({ data: { data: [], pagination: { total: 0 } } } as never);
  vi.spyOn(statsHook, 'useMyStatistics').mockReturnValue({ data: statistics } as never);
  vi.spyOn(currencyHook, 'useAllCurrencyStatus').mockReturnValue({
    data: { ratings, passengerCurrency: [] }, isLoading: false,
  } as never);
  vi.spyOn(credentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false } as never);
  vi.spyOn(classStatsHook, 'useStatsByClass').mockReturnValue({ data: undefined } as never);
  vi.spyOn(trendsHook, 'useTrends').mockReturnValue({ data: undefined } as never);
  vi.spyOn(aircraftHook, 'useAircraftStats').mockReturnValue({ data: byType(aircraftTypes) } as never);
  vi.spyOn(remindersHook, 'useAllAircraftReminders').mockReturnValue({ data: [], isLoading: false } as never);
  vi.spyOn(customCurrencyHook, 'useCustomCurrencies').mockReturnValue({ data: [] } as never);
  vi.spyOn(licensesHook, 'useLicenses').mockReturnValue({
    data: [
      { id: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL' },
      { id: 'l2', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)' },
    ],
  } as never);
}

const breakdown = () => within(screen.getByTestId('time-breakdown'));

beforeEach(() => {
  vi.restoreAllMocks();
  useAuthStore.setState({ user: { id: 'u1', name: 'Pilot', email: 'p@t.com' }, accessToken: 'tok' } as never);
});

describe('Dashboard on the relevance registry', () => {
  it('A1/A2 Mark: block heading, night and IFR tiles and card order unchanged', () => {
    asProfile(PERSONA_PROFILES.mark());
    mockCommon(stats({ nightMinutes: 60, ifrMinutes: 300 }), [rating('cr1', 'MEP_LAND', 'l2', 'current', 'ATPL'), rating('cr2', 'IR', 'l2')]);
    renderPage(<DashboardPage />);
    expect(breakdown().getByText('Block Time Breakdown')).toBeInTheDocument();
    expect(breakdown().getByText('Night')).toBeInTheDocument();
    expect(breakdown().getByText('IFR')).toBeInTheDocument();
    expect(screen.queryByTestId('fold-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dormant-ratings')).not.toBeInTheDocument();
  });

  it('L Lena: no IFR or Night tile and no "Block" in the breakdown', () => {
    asProfile(PERSONA_PROFILES.lena());
    mockCommon(stats(), [rating('cr1', 'GLIDER', 'l1')]);
    renderPage(<DashboardPage />);
    expect(breakdown().getByText('Time Breakdown')).toBeInTheDocument();
    expect(breakdown().queryByText(/block/i)).not.toBeInTheDocument();
    expect(breakdown().queryByText('IFR')).not.toBeInTheDocument();
    expect(breakdown().queryByText('Night')).not.toBeInTheDocument();
    fireEvent.click(breakdown().getByRole('button', { name: 'More (2)' }));
    expect(breakdown().getByText('IFR')).toBeInTheDocument();
    expect(breakdown().getByText('Night')).toBeInTheDocument();
  });

  it('invariant 2 — Lena with one IFR flight sees the IFR tile', () => {
    asProfile(PERSONA_PROFILES.lena());
    mockCommon(stats({ ifrMinutes: 30 }), [rating('cr1', 'GLIDER', 'l1')]);
    renderPage(<DashboardPage />);
    expect(breakdown().getByText('IFR')).toBeInTheDocument();
    expect(breakdown().queryByText('Night')).not.toBeInTheDocument();
  });

  it('K2 Karl: the dormant glider card is not first and not a red alarm', () => {
    asProfile(PERSONA_PROFILES.karl());
    mockCommon(stats(), [rating('cr1', 'GLIDER', 'l1', 'lapsed'), rating('cr2', 'TMG', 'l1')]);
    renderPage(<DashboardPage />);
    const section = screen.getByTestId('currency-section');
    const dormant = within(section).getByTestId('dormant-rating-cr1');
    expect(dormant).toHaveTextContent('Dormant — not flown in 24 months');
    expect(dormant.className).not.toMatch(/red/);
    expect(within(dormant).queryByText(/lapsed/i)).not.toBeInTheDocument();
    expect(section.textContent!.indexOf('TMG')).toBeLessThan(section.textContent!.indexOf('Glider'));
    fireEvent.click(within(dormant).getByRole('button', { name: /show status/i }));
    expect(within(dormant).getAllByText('Glider').length).toBeGreaterThan(1);
  });

  it('M Mehmet: the dormant PPL SEP card sits below the UL card', () => {
    asProfile(PERSONA_PROFILES.mehmet());
    mockCommon(stats(), [rating('cr2', 'SEP_LAND', 'l2', 'expiring', 'PPL(A)'), rating('cr1', 'ULTRALIGHT', 'l1', 'current', 'UL')]);
    renderPage(<DashboardPage />);
    const section = screen.getByTestId('currency-section');
    expect(within(section).getByTestId('dormant-rating-cr2')).toBeInTheDocument();
    expect(section.textContent!.indexOf('Ultralight')).toBeLessThan(section.textContent!.indexOf('SEP (Land)'));
    expect(breakdown().getByText('Time Breakdown')).toBeInTheDocument();
  });

  it('S3 Sabine: no "IFR", "SIC" or "block" on the dashboard', () => {
    asProfile(PERSONA_PROFILES.sabine());
    mockCommon(stats(), [rating('cr1', 'ULTRALIGHT', 'l1', 'current', 'UL')]);
    renderPage(<DashboardPage />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bIFR\b/);
    expect(text).not.toMatch(/\bSIC\b/);
    expect(text).not.toMatch(/block/i);
  });

  it('fails open while the profile loads', () => {
    asProfile(undefined, true);
    mockCommon(stats(), [rating('cr1', 'GLIDER', 'l1')]);
    renderPage(<DashboardPage />);
    expect(breakdown().getByText('Block Time Breakdown')).toBeInTheDocument();
    expect(breakdown().getByText('IFR')).toBeInTheDocument();
    expect(breakdown().getByText('Night')).toBeInTheDocument();
  });
});

describe('Currency page on the relevance registry', () => {
  it('A1/A2 Mark: the aircraft recency table stays in place', () => {
    asProfile(PERSONA_PROFILES.mark());
    mockCommon(stats(), [rating('cr1', 'SEP_LAND', 'l2', 'current', 'PPL(A)')], ['A320']);
    renderPage(<CurrencyPage />);
    expect(screen.getByTestId('aircraft-recency-section')).toBeInTheDocument();
    expect(screen.queryByTestId('fold-drawer')).not.toBeInTheDocument();
  });

  it('L Lena: the aircraft recency table folds into "More sections"', () => {
    asProfile(PERSONA_PROFILES.lena());
    mockCommon(stats(), [rating('cr1', 'GLIDER', 'l1')], ['ASK 21']);
    renderPage(<CurrencyPage />);
    expect(screen.queryByTestId('aircraft-recency-section')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More sections (1)' }));
    expect(screen.getByTestId('aircraft-recency-section')).toBeInTheDocument();
  });

  it('L Lena: an explicitly enabled per-registration recency keeps the table in place', () => {
    useAuthStore.setState({ user: { id: 'u1', name: 'Lena', email: 'l@t.com', recencyPerRegistration: true } } as never);
    asProfile(PERSONA_PROFILES.lena());
    mockCommon(stats(), [rating('cr1', 'GLIDER', 'l1')], ['ASK 21']);
    renderPage(<CurrencyPage />);
    expect(screen.getByTestId('aircraft-recency-section')).toBeInTheDocument();
  });

  it('K2 Karl: the dormant glider rating sorts last with a dormant note', () => {
    asProfile(PERSONA_PROFILES.karl());
    mockCommon(stats(), [rating('cr1', 'GLIDER', 'l1', 'lapsed'), rating('cr2', 'TMG', 'l1')]);
    renderPage(<CurrencyPage />);
    const note = screen.getByTestId('dormant-note-cr1');
    expect(note).toHaveTextContent('Dormant — not flown in 24 months');
    const text = document.body.textContent ?? '';
    expect(text.indexOf('TMG')).toBeLessThan(text.indexOf('Dormant — not flown'));
  });

  it('S3 Sabine: no "IFR", "SIC" or "block" on the currency page', () => {
    asProfile(PERSONA_PROFILES.sabine());
    mockCommon(stats(), [rating('cr1', 'ULTRALIGHT', 'l1', 'current', 'UL')], ['Tanarg']);
    renderPage(<CurrencyPage />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bIFR\b/);
    expect(text).not.toMatch(/\bSIC\b/);
    expect(text).not.toMatch(/block/i);
  });
});

describe('Class pickers', () => {
  const OPTIONS = ['SEP_LAND', 'MEP_LAND', 'TMG', 'GLIDER', 'ULTRALIGHT', 'IR', 'OTHER'].map((v) => ({ value: v, label: v }));
  const renderPicker = (current?: string) =>
    renderPage(
      <select aria-label="class" defaultValue={current}>
        <ClassOptions options={OPTIONS} current={current} />
      </select>,
    );

  it('A1 Mark: no glider or UL class without opening "More classes"; every option stays selectable', () => {
    asProfile(PERSONA_PROFILES.mark());
    renderPicker();
    const more = screen.getByRole('group', { name: 'More classes' });
    expect(within(more).getByRole('option', { name: 'ULTRALIGHT' })).toBeInTheDocument();
    expect(within(more).getByRole('option', { name: 'GLIDER' })).toBeInTheDocument();
    expect(within(more).queryByRole('option', { name: 'SEP_LAND' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toHaveLength(OPTIONS.length);
    fireEvent.change(screen.getByLabelText('class'), { target: { value: 'ULTRALIGHT' } });
    expect((screen.getByLabelText('class') as HTMLSelectElement).value).toBe('ULTRALIGHT');
  });

  it('L Lena: the glider class comes first', () => {
    asProfile(PERSONA_PROFILES.lena());
    renderPicker();
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('GLIDER');
  });

  it('keeps the selected class out of "More classes"', () => {
    asProfile(PERSONA_PROFILES.lena());
    renderPicker('SEP_LAND');
    const more = screen.getByRole('group', { name: 'More classes' });
    expect(within(more).queryByRole('option', { name: 'SEP_LAND' })).not.toBeInTheDocument();
  });

  it('fails open while the profile loads: no group', () => {
    asProfile(undefined, true);
    renderPicker();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });
});

describe('Aircraft form flags', () => {
  beforeEach(() => {
    vi.spyOn(aircraftHook, 'useAircraftById').mockReturnValue({ data: undefined } as never);
    vi.spyOn(aircraftHook, 'useAircraftStats').mockReturnValue({ data: undefined } as never);
    vi.spyOn(aircraftHook, 'useCreateAircraft').mockReturnValue({ mutateAsync: vi.fn() } as never);
    vi.spyOn(aircraftHook, 'useUpdateAircraft').mockReturnValue({ mutateAsync: vi.fn() } as never);
  });

  it('A2 Mark: complex, high-performance, tailwheel and multi-pilot shown in place', () => {
    asProfile(PERSONA_PROFILES.mark());
    renderPage(<AircraftForm onClose={() => {}} />);
    expect(screen.getByLabelText('Complex')).toBeInTheDocument();
    expect(screen.getByLabelText(/multi-pilot/i)).toBeInTheDocument();
    expect(screen.queryByTestId('fold-drawer')).not.toBeInTheDocument();
  });

  it('S3 Sabine: aeroplane and multi-crew flags fold into "More"', () => {
    asProfile(PERSONA_PROFILES.sabine());
    renderPage(<AircraftForm onClose={() => {}} />);
    expect(screen.queryByLabelText('Complex')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More (4)' }));
    expect(screen.getByLabelText('Complex')).toBeInTheDocument();
    expect(screen.getByLabelText(/multi-pilot/i)).toBeInTheDocument();
  });

  it('P Petra: choosing an aeroplane class brings the aeroplane flags back', () => {
    asProfile(PERSONA_PROFILES.lena());
    renderPage(<AircraftForm onClose={() => {}} />);
    expect(screen.queryByLabelText('Complex')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Aircraft Class'), { target: { value: 'SEP_LAND' } });
    expect(screen.getByLabelText('Complex')).toBeInTheDocument();
  });
});

describe('Dashboard time by class — UL kinds', () => {
  const ulRow = (ulKind: string | null, minutes: number, flights: number) => ({
    ulKind, minutes, flights, landings: flights, picMinutes: minutes, dualMinutes: 0,
  });

  it('S Sabine: the ULTRALIGHT row lists trike, powered paraglider and "Kind not set"', () => {
    asProfile(PERSONA_PROFILES.sabine());
    mockCommon(stats(), []);
    vi.spyOn(classStatsHook, 'useStatsByClass').mockReturnValue({
      data: {
        byClass: [{
          class: 'ULTRALIGHT', minutes: 900, flights: 40, landings: 40, picMinutes: 900,
          byUlKind: [ulRow('WEIGHT_SHIFT', 600, 20), ulRow('POWERED_PARAGLIDER', 240, 16), ulRow(null, 60, 4)],
        }],
        byAuthority: [],
      },
    } as never);
    renderPage(<DashboardPage />);
    const kinds = within(screen.getByTestId('class-stat-ULTRALIGHT'));
    expect(kinds.getByTestId('ul-kind-stat-WEIGHT_SHIFT')).toHaveTextContent('Weight-shift');
    expect(kinds.getByTestId('ul-kind-stat-POWERED_PARAGLIDER')).toHaveTextContent('4h 0m');
    expect(kinds.getByTestId('ul-kind-stat-none')).toHaveTextContent('Kind not set');
  });

  it('A1 Mark: rows without byUlKind render no kind list', () => {
    asProfile(PERSONA_PROFILES.mark());
    mockCommon(stats(), []);
    vi.spyOn(classStatsHook, 'useStatsByClass').mockReturnValue({
      data: { byClass: [{ class: 'MEP_LAND', minutes: 900, flights: 40, landings: 40, picMinutes: 900 }], byAuthority: [] },
    } as never);
    renderPage(<DashboardPage />);
    expect(screen.getByTestId('class-stat-MEP_LAND')).toBeInTheDocument();
    expect(screen.queryByTestId('class-stat-ul-kinds')).not.toBeInTheDocument();
  });
});
