import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CurrencyCard } from '../../components/currency/CurrencyCard';
import { CurrencyExpiryBanner } from '../../components/currency/CurrencyExpiryBanner';
import { isRatingAlert, isRatingNotCurrent, ratingStatus } from '../../lib/ratingStatus';
import type { ClassRatingCurrency } from '../../types/api';
import enCurrency from '../../i18n/locales/en/currency.json';
import deCurrency from '../../i18n/locales/de/currency.json';

const rating = (overrides: Partial<ClassRatingCurrency>): ClassRatingCurrency => ({
  classRatingId: 'cr-ul',
  classType: 'ULTRALIGHT',
  licenseId: 'lic-ul',
  regulatoryAuthority: 'DULV',
  licenseType: 'UL',
  status: 'current',
  message: '',
  ...overrides,
});

const renderCard = (r: ClassRatingCurrency) =>
  render(
    <MemoryRouter>
      <CurrencyCard rating={r} />
    </MemoryRouter>
  );

describe('ratingStatus', () => {
  it('passes known statuses through', () => {
    for (const s of ['current', 'expiring', 'expired', 'lapsed', 'unknown'] as const) {
      expect(ratingStatus(s)).toBe(s);
    }
  });

  it('maps an unrecognised status to not current, never current', () => {
    expect(ratingStatus('suspended')).toBe('expired');
    expect(ratingStatus(undefined)).toBe('expired');
    expect(isRatingNotCurrent('suspended')).toBe(true);
    expect(isRatingAlert('suspended')).toBe(true);
  });

  it('treats lapsed as an alert and not current', () => {
    expect(isRatingAlert('lapsed')).toBe(true);
    expect(isRatingNotCurrent('lapsed')).toBe(true);
    expect(isRatingNotCurrent('expiring')).toBe(false);
  });
});

describe('CurrencyCard — lapsed', () => {
  it('M2: lapsed renders as not current with the licence-valid helper', () => {
    renderCard(rating({ status: 'lapsed', messageKey: 'rating.recency_not_met', ruleDescriptionKey: 'ul_luftpersv' }));
    const badge = screen.getByText('NOT CURRENT');
    expect(badge).toHaveClass('badge-expired');
    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
    expect(screen.getByTestId('currency-status-helper')).toHaveTextContent('Licence valid — recency not met');
    expect(screen.getByText('Recency requirements not fully met.')).toBeInTheDocument();
  });

  it('lapsed shows no expiry countdown even when an expiry date is present', () => {
    renderCard(rating({ status: 'lapsed', messageKey: 'rating.recency_not_met', expiryDate: '2027-01-01' }));
    expect(screen.queryByText(/Expires/i)).not.toBeInTheDocument();
  });

  it('expired keeps its own badge without the lapsed helper', () => {
    renderCard(rating({ classType: 'SEP_LAND', regulatoryAuthority: 'EASA', status: 'expired', messageKey: 'rating.expired' }));
    expect(screen.getByText('NOT CURRENT')).toBeInTheDocument();
    expect(screen.queryByTestId('currency-status-helper')).not.toBeInTheDocument();
  });

  it('an unrecognised future status renders as not current, never current', () => {
    renderCard(rating({ status: 'suspended' as ClassRatingCurrency['status'], messageKey: 'rating.some_future_key' }));
    expect(screen.getByText('NOT CURRENT')).toHaveClass('badge-expired');
    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
    expect(screen.getByText('No details are available for this status.')).toBeInTheDocument();
  });
});

describe('CurrencyCard — ultralight kind', () => {
  it('S1: ul_kind_required prompts to set the kind and links to the rating edit', () => {
    renderCard(rating({ classRatingId: 'cr-9', status: 'unknown', messageKey: 'rating.ul_kind_required' }));
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText(/No ultralight kind set on this rating/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Set ultralight kind/ });
    expect(link).toHaveAttribute('href', '/licenses?editRating=cr-9');
  });

  it('S1: unclassifiedFlights shows a warning linking to the aircraft page', () => {
    renderCard(rating({ status: 'lapsed', messageKey: 'rating.recency_not_met', unclassifiedFlights: 3 }));
    const warning = screen.getByTestId('currency-unclassified-flights');
    expect(warning).toHaveTextContent(
      '3 flights on ultralights without a kind were not counted — set the kind on the aircraft'
    );
    expect(within(warning).getByRole('link', { name: 'Go to aircraft' })).toHaveAttribute('href', '/aircraft');
  });

  it('uses the singular for one unclassified flight', () => {
    renderCard(rating({ status: 'current', messageKey: 'rating.recency_current', unclassifiedFlights: 1 }));
    expect(screen.getByTestId('currency-unclassified-flights')).toHaveTextContent(
      '1 flight on an ultralight without a kind was not counted'
    );
  });

  it('shows no warning when unclassifiedFlights is absent', () => {
    renderCard(rating({ status: 'current', messageKey: 'rating.recency_current' }));
    expect(screen.queryByTestId('currency-unclassified-flights')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Set ultralight kind/ })).not.toBeInTheDocument();
  });
});

describe('CurrencyCard — FAA glider', () => {
  const faaGlider = (overrides: Partial<ClassRatingCurrency>) =>
    rating({
      classRatingId: 'cr-g',
      classType: 'GLIDER',
      regulatoryAuthority: 'FAA',
      licenseType: 'PPL',
      ruleDescriptionKey: 'faa_flight_review',
      ...overrides,
    });

  it('resolves a flight_review.* messageKey on the rating', () => {
    renderCard(faaGlider({ status: 'current', messageKey: 'flight_review.current', messageParams: { date: '2025-04-18' } }));
    expect(screen.getByText(/^Current — last completed /)).toBeInTheDocument();
  });

  it('resolves flight_review.none_on_record and expiring with days', () => {
    const { unmount } = renderCard(faaGlider({ status: 'expired', messageKey: 'flight_review.none_on_record' }));
    expect(screen.getByText('No flight review on record.')).toBeInTheDocument();
    unmount();
    renderCard(faaGlider({ status: 'expiring', messageKey: 'flight_review.expiring', messageParams: { days: 12, date: '2024-09-10' } }));
    expect(screen.getByText(/^Expires in 12 days — last completed /)).toBeInTheDocument();
  });

  it('renders the §61.56(b) glider alternative and the flight review requirement', () => {
    renderCard(
      faaGlider({
        status: 'current',
        messageKey: 'rating.flight_review_glider_alternative',
        requirements: [
          { nameKey: 'requirement.flight_review', met: false, current: 0, required: 1, unit: 'review', messageKey: 'requirement.prof_check_missing' },
          { nameKey: 'requirement.training_flights', met: true, current: 3, required: 3, unit: 'flights', messageKey: 'requirement.progress' },
        ],
      })
    );
    expect(screen.getByText(/three instructional glider flights/)).toBeInTheDocument();
    expect(screen.getByText('Flight Review')).toBeInTheDocument();
    expect(screen.getByText('Not completed')).toBeInTheDocument();
  });
});

describe('CurrencyCard — training flight', () => {
  it('M2: training_flight reads as one flight, with the longest flight against 1 h', () => {
    renderCard(
      rating({
        status: 'lapsed',
        messageKey: 'rating.recency_not_met',
        requirements: [
          { nameKey: 'requirement.training_flight', met: false, current: 45, required: 60, unit: 'minutes', messageKey: 'requirement.progress' },
          { nameKey: 'requirement.refresher_training', met: true, current: 90, required: 60, unit: 'minutes', messageKey: 'requirement.progress' },
        ],
      })
    );
    expect(screen.getByText('Training flight with instructor (one flight ≥ 1 h)')).toBeInTheDocument();
    const training = screen.getByTestId('requirement-requirement.training_flight');
    expect(training).toHaveTextContent(/longest: .*45.* \/ .*1.*/);
    const refresher = screen.getByTestId('requirement-requirement.refresher_training');
    expect(refresher).toHaveTextContent('Refresher Training');
    expect(refresher).not.toHaveTextContent(/longest/);
  });
});

describe('CurrencyExpiryBanner — lapsed', () => {
  it('lists a lapsed rating as needing action, without a countdown', () => {
    render(
      <CurrencyExpiryBanner
        ratings={[rating({ classRatingId: 'cr-l', status: 'lapsed', expiryDate: '2027-01-01', ruleDescriptionKey: 'ul_luftpersv' })]}
      />
    );
    expect(screen.getByText('Action needed to fly again')).toBeInTheDocument();
    const item = screen.getByTestId('currency-expiry-item-rating-cr-l');
    expect(item).toHaveTextContent(/Your licence stays valid/);
    expect(item).not.toHaveTextContent(/Expires in|ago/);
  });

  it('lists an unrecognised status as needing action', () => {
    render(<CurrencyExpiryBanner ratings={[rating({ classRatingId: 'cr-x', status: 'suspended' as ClassRatingCurrency['status'] })]} />);
    expect(screen.getByTestId('currency-expiry-item-rating-cr-x')).toBeInTheDocument();
    expect(screen.getByText('Action needed to fly again')).toBeInTheDocument();
  });
});

type Catalogue = Record<string, unknown>;
const lookup = (obj: Catalogue, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Catalogue)[k] : undefined), obj);
const hasKey = (obj: Catalogue, path: string) =>
  typeof lookup(obj, path) === 'string' ||
  typeof lookup(obj, `${path}_one`) === 'string' ||
  typeof lookup(obj, `${path}_other`) === 'string';

describe('currency catalogue — contract keys', () => {
  const ratingKeys = [
    'rating.no_expiry_date', 'rating.no_expiry_date_manual', 'rating.evaluation_failed', 'rating.expired',
    'rating.expiring', 'rating.valid_until', 'rating.window_not_open', 'rating.revalidation_not_met',
    'rating.revalidation_not_met_prof_check', 'rating.revalidation_expiring_met', 'rating.revalidation_current',
    'rating.recency_not_met', 'rating.recency_current', 'rating.sfcl_tmg_exempt', 'rating.ul_kind_required',
    'rating.ir_hours_and_check_not_met', 'rating.ir_hours_not_met', 'rating.ir_check_not_met', 'rating.ir_current',
    'rating.ir_lapsed_safety_pilot', 'rating.ir_expired_ipc', 'rating.ir_not_applicable', 'rating.pax_not_current',
    'rating.pax_day_current_night_not', 'rating.pax_current_day_night', 'rating.flight_review_glider_alternative',
    'flight_review.evaluation_failed', 'flight_review.none_on_record', 'flight_review.expired',
    'flight_review.expiring', 'flight_review.current',
  ];
  const nameKeys = [
    'total_time', 'pic_time', 'ifr_time', 'landings', 'day_landings', 'night_landings', 'refresher_training',
    'training_flight', 'proficiency_check', 'approaches', 'holds', 'route_sectors', 'launches', 'sep_land_time',
    'sep_land_landings', 'sep_sea_time', 'sep_sea_landings', 'flight_time', 'training_flights', 'tmg_time',
    'tmg_landings', 'tmg_training_flight', 'flight_review',
  ];
  const clientKeys = [
    'status.lapsed', 'status.lapsedHelper', 'setUlKind', 'unclassifiedFlights', 'unclassifiedFlightsLink',
    'messageUnrecognised', 'expiryBanner.nextSteps.lapsed', 'requirementLongest',
  ];

  for (const [lang, cat] of [['en', enCurrency], ['de', deCurrency]] as const) {
    it(`${lang}: every rating messageKey in the contract has a string`, () => {
      expect(ratingKeys.filter((k) => !hasKey(cat, `messages.${k}`))).toEqual([]);
    });

    it(`${lang}: every requirement nameKey in the contract has a label`, () => {
      expect(nameKeys.filter((k) => !hasKey(cat, `requirement.${k}`))).toEqual([]);
    });

    it(`${lang}: client-side lapsed and ultralight-kind strings exist`, () => {
      expect(clientKeys.filter((k) => !hasKey(cat, k))).toEqual([]);
    });

    it(`${lang}: keys the API no longer sends are gone`, () => {
      expect(hasKey(cat, 'messages.rating.glider_current')).toBe(false);
      expect(hasKey(cat, 'messages.rating.glider_not_current')).toBe(false);
      expect(hasKey(cat, 'requirement.launches_and_landings')).toBe(false);
    });
  }

  it('faa_glider describes §61.57(a) take-offs and landings, not launches', () => {
    expect(enCurrency.ruleDescriptions.faa_glider).toMatch(/takeoffs & landings/);
    expect(enCurrency.ruleDescriptions.faa_glider).not.toMatch(/launch/i);
    expect(deCurrency.ruleDescriptions.faa_glider).toMatch(/Starts & Landungen/);
  });

  it('de never uses "Recency" for the lapsed wording', () => {
    expect(deCurrency.status.lapsed).toBe('Nicht aktuell');
    expect(deCurrency.status.lapsedHelper).toBe('Lizenz gültig — fortlaufende Flugerfahrung nicht erfüllt');
  });
});
