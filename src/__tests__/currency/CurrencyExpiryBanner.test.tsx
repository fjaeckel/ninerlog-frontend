import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyExpiryBanner } from '../../components/currency/CurrencyExpiryBanner';
import type { ClassRatingCurrency, FlightReviewStatus } from '../../types/api';

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const rating = (overrides: Partial<ClassRatingCurrency>): ClassRatingCurrency => ({
  classRatingId: 'cr-1',
  classType: 'SEP_LAND',
  licenseId: 'lic-1',
  regulatoryAuthority: 'EASA',
  status: 'expiring',
  message: '',
  ...overrides,
});

describe('CurrencyExpiryBanner', () => {
  it('renders nothing when all ratings are current', () => {
    const { container } = render(
      <CurrencyExpiryBanner ratings={[rating({ status: 'current' })]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no ratings or flight review', () => {
    const { container } = render(<CurrencyExpiryBanner ratings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the expiring heading (amber) when nothing is expired yet', () => {
    render(
      <CurrencyExpiryBanner
        ratings={[rating({ status: 'expiring', expiryDate: inDays(20) })]}
      />
    );
    expect(screen.getByText('Renewal coming up')).toBeInTheDocument();
    expect(screen.getByText(/Expires in (19|20) days/)).toBeInTheDocument();
  });

  it('shows the expired heading (red) when at least one item is expired', () => {
    render(
      <CurrencyExpiryBanner
        ratings={[
          rating({ status: 'expiring', expiryDate: inDays(20) }),
          rating({ classRatingId: 'cr-2', status: 'expired', expiryDate: inDays(-5) }),
        ]}
      />
    );
    expect(screen.getByText('Action needed to fly again')).toBeInTheDocument();
    expect(screen.getByText(/Expired [45] days ago/)).toBeInTheDocument();
  });

  it('maps ruleDescriptionKey to the right next-step guidance', () => {
    render(
      <CurrencyExpiryBanner
        ratings={[
          rating({ status: 'expired', ruleDescriptionKey: 'easa_ir', expiryDate: inDays(-1) }),
        ]}
      />
    );
    expect(
      screen.getByText(/Book a proficiency check \(or IPC\) with an examiner or instructor/)
    ).toBeInTheDocument();
  });

  it('falls back to generic guidance for an unrecognized rule key', () => {
    render(
      <CurrencyExpiryBanner
        ratings={[rating({ status: 'expiring', ruleDescriptionKey: 'unknown_rule', expiryDate: inDays(10) })]}
      />
    );
    expect(screen.getByText(/Complete the requirements shown below/)).toBeInTheDocument();
  });

  it('includes an expiring FAA flight review with flight-review guidance', () => {
    const flightReview: FlightReviewStatus = {
      status: 'expiring',
      message: '',
      expiresOn: inDays(15),
    };
    render(<CurrencyExpiryBanner ratings={[]} flightReview={flightReview} />);
    expect(screen.getByText('Flight Review')).toBeInTheDocument();
    expect(screen.getByText(/Schedule a flight review/)).toBeInTheDocument();
  });

  it('omits a current flight review', () => {
    const flightReview: FlightReviewStatus = { status: 'current', message: '' };
    const { container } = render(<CurrencyExpiryBanner ratings={[]} flightReview={flightReview} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sorts expired items before expiring ones, soonest first', () => {
    render(
      <CurrencyExpiryBanner
        ratings={[
          rating({ classRatingId: 'cr-soon', classType: 'IR', status: 'expiring', expiryDate: inDays(5) }),
          rating({ classRatingId: 'cr-late', classType: 'TMG', status: 'expiring', expiryDate: inDays(60) }),
          rating({ classRatingId: 'cr-expired', classType: 'MEP_LAND', status: 'expired', expiryDate: inDays(-2) }),
        ]}
      />
    );
    const items = screen.getAllByText(/\(EASA\)/).map((el) => el.textContent);
    expect(items).toEqual([
      'MEP (Land) (EASA)',
      'Instrument Rating (EASA)',
      'TMG (EASA)',
    ]);
  });

  it('collapses beyond 3 items with a show more / show less toggle', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <CurrencyExpiryBanner
        ratings={[
          rating({ classRatingId: 'cr-1', classType: 'SEP_LAND', status: 'expiring', expiryDate: inDays(10) }),
          rating({ classRatingId: 'cr-2', classType: 'MEP_LAND', status: 'expiring', expiryDate: inDays(11) }),
          rating({ classRatingId: 'cr-3', classType: 'TMG', status: 'expiring', expiryDate: inDays(12) }),
          rating({ classRatingId: 'cr-4', classType: 'IR', status: 'expiring', expiryDate: inDays(13) }),
        ]}
      />
    );
    expect(screen.getByText('Show 1 more')).toBeInTheDocument();
    expect(screen.queryByText('Instrument Rating (EASA)')).not.toBeInTheDocument();

    await user.click(screen.getByText('Show 1 more'));
    expect(screen.getByText('Instrument Rating (EASA)')).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });
});
