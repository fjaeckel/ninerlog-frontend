import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { ReadinessCard } from '../../components/currency/ReadinessCard';
import * as currencyHook from '../../hooks/useCurrency';
import * as credentialsHook from '../../hooks/useCredentials';
import * as readinessHook from '../../hooks/useReadiness';
import { ReadinessError, type ReadinessItem, type ReadinessReport } from '../../hooks/useReadiness';
import i18n from '../../i18n';
import type { ClassRatingCurrency } from '../../types/api';

const glider: ClassRatingCurrency = {
  classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
  status: 'current', message: '', messageKey: 'rating.recency_current',
};

const lenaToday: ReadinessItem[] = [
  { kind: 'rating', classRatingId: 'cr1', classType: 'GLIDER', ready: true, status: 'current', reasonKey: 'rating.recency_current' },
  { kind: 'launch_method', classRatingId: 'cr1', launchMethod: 'winch', ready: true, status: 'current', reasonKey: 'readiness.launch_method_current', params: { date: '2028-08-07' } },
  { kind: 'launch_method', classRatingId: 'cr1', launchMethod: 'aerotow', ready: false, status: 'lapsed', reasonKey: 'remedy.launch_method_dual', params: { method: 'aerotow', missing: 2 } },
  { kind: 'passengers', classType: 'GLIDER', ready: true, status: 'current', reasonKey: 'pax.current_day_no_night_privilege' },
  { kind: 'credential', credentialId: 'c1', ready: true, status: 'valid', reasonKey: 'readiness.credential_valid', params: { date: '2029-03-11' } },
];

type ReadinessResult = { data?: ReadinessReport; error?: unknown; isLoading?: boolean };

const today = format(new Date(), 'yyyy-MM-dd');

function mockAll({
  ratings = [glider] as ClassRatingCurrency[] | undefined,
  currencyLoading = false,
  readiness = { data: { date: today, items: lenaToday } } as ReadinessResult,
} = {}) {
  vi.spyOn(currencyHook, 'useAllCurrencyStatus').mockReturnValue({
    data: ratings ? { ratings, passengerCurrency: [] } : undefined,
    isLoading: currencyLoading,
  } as never);
  vi.spyOn(credentialsHook, 'useCredentials').mockReturnValue({
    data: [{ id: 'c1', credentialType: 'EASA_LAPL_MEDICAL' }],
  } as never);
  return vi.spyOn(readinessHook, 'useReadiness').mockReturnValue({
    isLoading: false, isFetching: false, refetch: vi.fn(), error: null, ...readiness,
  } as never);
}

const withItems = (items: ReadinessItem[]): ReadinessResult => ({ data: { date: today, items } });

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

  it('asks for today, all ratings and passengers, with nothing to fill in', () => {
    const spy = mockAll();
    renderCard();
    expect(spy).toHaveBeenLastCalledWith({ date: today, aircraftReg: null, passengers: true });
    expect(screen.getByRole('heading', { name: 'What you can fly today' })).toBeInTheDocument();
    expect(within(screen.getByTestId('readiness-card')).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('readiness-card')).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('readiness-card')).queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('L4: Lena flies gliders with passengers; winch ✓, aerotow ✗ (2 launches)', () => {
    mockAll();
    renderCard();
    const glider = screen.getByTestId('readiness-class-GLIDER');
    expect(glider).toHaveAttribute('data-tone', 'ok');
    expect(glider).toHaveTextContent('Glider');
    expect(glider).toHaveTextContent('With passengers');
    expect(screen.getByTestId('readiness-launch-winch')).toHaveAttribute('data-ready', 'true');
    expect(screen.getByTestId('readiness-launch-winch')).toHaveAttribute('title', 'Current until 07.08.2028');
    const aerotow = screen.getByTestId('readiness-launch-aerotow');
    expect(aerotow).toHaveAttribute('data-ready', 'false');
    expect(aerotow).toHaveTextContent('Aerotow');
    expect(aerotow).toHaveTextContent('· 2 more launches, dual or supervised solo');
    expect(aerotow).toHaveAttribute('title', 'Fly 2 more launches dual or supervised solo (Aerotow)');
    expect(screen.getByTestId('readiness-medical')).toHaveTextContent('Medical');
    expect(screen.getByTestId('readiness-medical')).toHaveAttribute('data-tone', 'ok');
  });

  it('L4: the German card speaks Luftsport', async () => {
    await i18n.changeLanguage('de');
    mockAll();
    renderCard();
    expect(screen.getByRole('heading', { name: 'Was du heute fliegen darfst' })).toBeInTheDocument();
    expect(screen.getByTestId('readiness-class-GLIDER')).toHaveTextContent('Mit Passagieren');
    expect(screen.getByTestId('readiness-launch-aerotow')).toHaveTextContent('F-Schlepp · noch 2 Starts im Doppelsitzer oder unter Aufsicht');
  });

  it('K: Karl flies the TMG, not the sailplane; flyable classes come first', () => {
    const tmg = { ...glider, classRatingId: 'cr2', classType: 'TMG' } as ClassRatingCurrency;
    mockAll({
      ratings: [glider, tmg],
      readiness: withItems([
        { kind: 'rating', classRatingId: 'cr1', classType: 'GLIDER', ready: false, status: 'lapsed', reasonKey: 'remedy.fly_more', params: { missing: 15, unit: 'launches' } },
        { kind: 'rating', classRatingId: 'cr2', classType: 'TMG', ready: true, status: 'current', reasonKey: 'rating.recency_current' },
        { kind: 'passengers', classType: 'TMG', ready: true, status: 'current', reasonKey: 'pax.current_day_no_night_privilege' },
        { kind: 'passengers', classType: 'GLIDER', ready: false, status: 'expired', reasonKey: 'pax.not_current', params: { needed: 3 } },
      ]),
    });
    renderCard();
    const rows = screen.getAllByTestId(/^readiness-class-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(['readiness-class-TMG', 'readiness-class-GLIDER']);
    expect(rows[0]).toHaveTextContent('With passengers');
    expect(rows[1]).toHaveAttribute('data-tone', 'no');
    expect(rows[1]).toHaveTextContent('Not current');
  });

  it('solo only when passenger currency is short, counted in launches on sailplanes', () => {
    mockAll({
      readiness: withItems([
        lenaToday[0],
        { kind: 'passengers', classType: 'GLIDER', ready: false, status: 'expired', reasonKey: 'pax.not_current', params: { needed: 2 } },
      ]),
    });
    renderCard();
    const row = screen.getByTestId('readiness-class-GLIDER');
    expect(row).toHaveTextContent('Solo only');
    expect(row).toHaveTextContent('For passengers: 2 more launches');
  });

  it('M: an expiring rating keeps its reason next to the passenger shortfall', () => {
    mockAll({
      readiness: withItems([
        { kind: 'rating', classRatingId: 'cr1', classType: 'SEP_LAND', ready: true, status: 'expiring', reasonKey: 'rating.revalidation_not_met' },
        { kind: 'passengers', classType: 'SEP_LAND', ready: false, status: 'expired', reasonKey: 'pax.not_current', params: { needed: 3 } },
      ]),
    });
    renderCard();
    const row = screen.getByTestId('readiness-class-SEP_LAND');
    expect(row).toHaveAttribute('data-tone', 'warn');
    expect(row.querySelectorAll('p')).toHaveLength(2);
    expect(row).toHaveTextContent('For passengers: 3 more take-offs and landings');
  });

  it('flags a medical inside the renewal window', () => {
    mockAll({
      readiness: withItems([
        lenaToday[0],
        { kind: 'credential', credentialId: 'c1', ready: true, status: 'valid', reasonKey: 'readiness.credential_valid', params: { date: format(addDays(new Date(), 20), 'yyyy-MM-dd') } },
      ]),
    });
    renderCard();
    expect(screen.getByTestId('readiness-medical')).toHaveAttribute('data-tone', 'warn');
  });

  it('an expired medical says nothing may be flown', () => {
    mockAll({
      readiness: withItems([
        lenaToday[0],
        { kind: 'credential', credentialId: 'c1', ready: false, status: 'expired', reasonKey: 'readiness.credential_expired', params: { date: '2026-09-30' } },
      ]),
    });
    renderCard();
    expect(screen.getByTestId('readiness-medical-blocks')).toBeInTheDocument();
    expect(screen.getByTestId('readiness-medical')).toHaveTextContent('Expired on 30.09.2026');
  });

  it('J: a student with no rating item is not told everything is current', () => {
    mockAll({ readiness: withItems([lenaToday[4]]) });
    renderCard();
    expect(screen.getByTestId('readiness-empty')).toHaveTextContent('None of your ratings lets you fly on your own yet.');
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

  it('a failure offers a retry', () => {
    mockAll({ readiness: { error: new ReadinessError(500, 'boom') } });
    renderCard();
    expect(within(screen.getByTestId('readiness-error')).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
