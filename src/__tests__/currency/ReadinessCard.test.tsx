import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { ReadinessCard } from '../../components/currency/ReadinessCard';
import { defaultReadinessAircraft, nextSaturday, readinessDateBounds } from '../../lib/readiness';
import * as currencyHook from '../../hooks/useCurrency';
import * as aircraftHook from '../../hooks/useAircraft';
import * as credentialsHook from '../../hooks/useCredentials';
import * as readinessHook from '../../hooks/useReadiness';
import { ReadinessError, type ReadinessItem, type ReadinessReport } from '../../hooks/useReadiness';
import i18n from '../../i18n';
import type { Aircraft } from '../../hooks/useAircraft';
import type { ClassRatingCurrency } from '../../types/api';

const glider: ClassRatingCurrency = {
  classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
  status: 'current', message: '', messageKey: 'rating.recency_current',
};

const ac = (registration: string, aircraftClass: Aircraft['aircraftClass'], extra: Partial<Aircraft> = {}) =>
  ({ id: registration, registration, type: 'AS21', model: 'ASK 21', aircraftClass, isActive: true, ...extra }) as Aircraft;

const lenaFleet = [ac('D-1234', 'GLIDER'), ac('D-5678', 'GLIDER', { type: 'LS4', model: 'LS4-b' })];

const statsFor = (counts: Record<string, number>) => ({
  byReg: new Map(Object.entries(counts).map(([reg, n]) => [reg, { registration: reg, totalFlights: n }])),
  byType: new Map(),
}) as unknown as aircraftHook.AircraftStatsData;

const lenaSaturday: ReadinessItem[] = [
  { kind: 'rating', classRatingId: 'cr1', classType: 'GLIDER', ready: true, status: 'current', reasonKey: 'rating.recency_current' },
  { kind: 'launch_method', classRatingId: 'cr1', launchMethod: 'winch', ready: true, status: 'current', reasonKey: 'readiness.launch_method_current', params: { date: '2028-08-07' } },
  { kind: 'launch_method', classRatingId: 'cr1', launchMethod: 'aerotow', ready: false, status: 'lapsed', reasonKey: 'remedy.launch_method_dual', params: { method: 'aerotow', missing: 2 } },
  { kind: 'passengers', classType: 'GLIDER', ready: true, status: 'current', reasonKey: 'pax.current_day_no_night_privilege' },
  { kind: 'credential', credentialId: 'c1', ready: true, status: 'valid', reasonKey: 'readiness.credential_valid', params: { date: '2029-03-11' } },
];

type ReadinessResult = { data?: ReadinessReport; error?: unknown; isLoading?: boolean };

function mockAll({
  ratings = [glider] as ClassRatingCurrency[] | undefined,
  currencyLoading = false,
  fleet = lenaFleet,
  stats = statsFor({ 'D-5678': 123, 'D-1234': 16 }),
  readiness = { data: { date: '2026-10-03', aircraftReg: 'D-5678', items: lenaSaturday } } as ReadinessResult,
} = {}) {
  vi.spyOn(currencyHook, 'useAllCurrencyStatus').mockReturnValue({
    data: ratings ? { ratings, passengerCurrency: [] } : undefined,
    isLoading: currencyLoading,
  } as never);
  vi.spyOn(aircraftHook, 'useAircraft').mockReturnValue({ data: fleet, isLoading: false } as never);
  vi.spyOn(aircraftHook, 'useAircraftStats').mockReturnValue({ data: stats, isLoading: false } as never);
  vi.spyOn(credentialsHook, 'useCredentials').mockReturnValue({
    data: [{ id: 'c1', credentialType: 'EASA_LAPL_MEDICAL' }],
  } as never);
  return vi.spyOn(readinessHook, 'useReadiness').mockReturnValue({
    isLoading: false, isFetching: false, refetch: vi.fn(), error: null, ...readiness,
  } as never);
}

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReadinessCard />
    </QueryClientProvider>,
  );

describe('ReadinessCard', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('L4: Lena reads solo ✓ winch ✓ aerotow ✗ (2 launches) passengers ✓', () => {
    mockAll();
    renderCard();
    const item = (id: string) => screen.getByTestId(`readiness-item-${id}`);
    expect(item('rating')).toHaveTextContent('Solo');
    expect(item('rating')).toHaveAttribute('data-ready', 'true');
    expect(item('launch_method-winch')).toHaveTextContent('Winch');
    expect(item('launch_method-winch')).toHaveAttribute('data-ready', 'true');
    expect(item('launch_method-aerotow')).toHaveAttribute('data-ready', 'false');
    expect(item('launch_method-aerotow')).toHaveTextContent('Aerotow');
    expect(item('launch_method-aerotow')).toHaveTextContent('(2 more launches)');
    expect(item('passengers')).toHaveAttribute('data-ready', 'true');
    expect(item('credential')).toHaveTextContent('Medical');
    expect(item('launch_method-winch')).toHaveAttribute('title', 'Current until 07.08.2028');
    expect(screen.getByTestId('readiness-reasons')).toHaveTextContent(
      'Aerotow: Fly 2 more launches dual or supervised solo (Aerotow)',
    );
    expect(screen.getByText(/Not everything is current on/)).toBeInTheDocument();
  });

  it('L4: the German card names what is missing in Luftsport terms', async () => {
    await i18n.changeLanguage('de');
    mockAll();
    renderCard();
    expect(screen.getByRole('heading', { name: 'Bereit zum Fliegen?' })).toBeInTheDocument();
    expect(screen.getByTestId('readiness-item-rating')).toHaveTextContent('Allein');
    expect(screen.getByTestId('readiness-reasons')).toHaveTextContent(
      'F-Schlepp: Noch 2 Starts im Doppelsitzer oder unter Aufsicht (F-Schlepp)',
    );
  });

  it('asks for next Saturday, the most-flown aircraft and passengers by default', () => {
    const spy = mockAll();
    renderCard();
    expect(spy).toHaveBeenLastCalledWith(
      { date: nextSaturday(), aircraftReg: 'D-5678', passengers: true },
      { enabled: true },
    );
    expect(screen.getByTestId('readiness-aircraft')).toHaveValue('D-5678');
  });

  it('asks again for another aircraft, all ratings, or without passengers', () => {
    const spy = mockAll();
    renderCard();
    fireEvent.change(screen.getByTestId('readiness-aircraft'), { target: { value: 'D-1234' } });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ aircraftReg: 'D-1234' }), { enabled: true });
    fireEvent.change(screen.getByTestId('readiness-aircraft'), { target: { value: '' } });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ aircraftReg: null }), { enabled: true });
    fireEvent.click(screen.getByTestId('readiness-passengers'));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ passengers: false }), { enabled: true });
  });

  it('bounds the date picker to today … +366 days and does not ask outside it', () => {
    const spy = mockAll();
    renderCard();
    const input = screen.getByTestId('readiness-date');
    const today = new Date();
    expect(input).toHaveAttribute('min', format(today, 'yyyy-MM-dd'));
    expect(input).toHaveAttribute('max', format(addDays(today, 366), 'yyyy-MM-dd'));

    fireEvent.change(input, { target: { value: format(addDays(today, 367), 'yyyy-MM-dd') } });
    expect(spy).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });
    expect(screen.getByTestId('readiness-date-error')).toHaveTextContent(/Choose a date between today and/);

    fireEvent.change(input, { target: { value: format(addDays(today, -1), 'yyyy-MM-dd') } });
    expect(spy).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });
  });

  it('G3/R2: Ruth, with no rating, gets no card', () => {
    mockAll({ ratings: [] });
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it('fail open: while currency loads it shows a skeleton, not an error', () => {
    mockAll({ ratings: undefined, currencyLoading: true });
    renderCard();
    expect(screen.getByTestId('readiness-skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('fail open: a failed currency load still shows the card', () => {
    mockAll({ ratings: undefined });
    renderCard();
    expect(screen.getByTestId('readiness-card')).toBeInTheDocument();
  });

  it('shows a skeleton while readiness loads', () => {
    mockAll({ readiness: { data: undefined, isLoading: true } });
    renderCard();
    expect(screen.getByTestId('readiness-loading')).toBeInTheDocument();
  });

  it('a 404 says the aircraft is not in the fleet', () => {
    mockAll({ readiness: { error: new ReadinessError(404, 'not found') } });
    renderCard();
    expect(screen.getByTestId('readiness-unknown-aircraft')).toHaveTextContent('no longer in your fleet');
  });

  it('a 400 asks for a date in range', () => {
    mockAll({ readiness: { error: new ReadinessError(400, 'bad date') } });
    renderCard();
    expect(screen.getByTestId('readiness-date-error')).toBeInTheDocument();
  });

  it('any other failure offers a retry', () => {
    mockAll({ readiness: { error: new ReadinessError(500, 'boom') } });
    renderCard();
    expect(within(screen.getByTestId('readiness-error')).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders status valid and an expired medical', () => {
    mockAll({
      readiness: {
        data: {
          date: '2026-10-03',
          items: [{ kind: 'credential', credentialId: 'c1', ready: false, status: 'expired', reasonKey: 'readiness.credential_expired', params: { date: '2026-09-30' } }],
        },
      },
    });
    renderCard();
    expect(screen.getByTestId('readiness-reasons')).toHaveTextContent('Medical: Expired on 30.09.2026');
  });
});

describe('readiness helpers', () => {
  it('next Saturday is today on a Saturday and the coming one otherwise', () => {
    expect(nextSaturday(new Date(2026, 8, 26))).toBe('2026-09-26');
    expect(nextSaturday(new Date(2026, 8, 27))).toBe('2026-10-03');
    expect(nextSaturday(new Date(2026, 8, 25))).toBe('2026-09-26');
  });

  it('bounds run from today to 366 days ahead', () => {
    expect(readinessDateBounds(new Date(2026, 8, 26))).toEqual({ min: '2026-09-26', max: '2027-09-27' });
  });

  it('defaults to the most-flown active aircraft a rating covers', () => {
    const mark = [ac('D-AIUA', 'MEP_LAND'), ac('D-EMKC', 'SEP_LAND'), ac('D-OLD', 'SEP_LAND', { isActive: false })];
    const sep = { ...glider, classType: 'SEP_LAND' } as ClassRatingCurrency;
    expect(defaultReadinessAircraft(mark, statsFor({ 'D-AIUA': 900, 'D-EMKC': 12, 'D-OLD': 50 }), [sep])).toBe('D-EMKC');
    expect(defaultReadinessAircraft(mark, statsFor({ 'D-AIUA': 900 }), [])).toBe('D-AIUA');
    expect(defaultReadinessAircraft([], undefined, [sep])).toBeNull();
  });
});
