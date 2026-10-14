import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpiryBadge } from '../../components/licenses/ExpiryBadge';
import { CurrencyExpiryBanner } from '../../components/currency/CurrencyExpiryBanner';
import type { FlightReviewStatus } from '../../types/api';

const originalTz = process.env.TZ;

describe('ExpiryBadge east of UTC', () => {
  beforeEach(() => {
    process.env.TZ = 'Pacific/Auckland';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 20, 14, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTz;
  });

  it('is valid on its last day', () => {
    render(<ExpiryBadge expiryDate="2026-08-20" />);
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    expect(screen.getByText('Expires in 0d')).toBeInTheDocument();
  });

  it('is expired the day after', () => {
    render(<ExpiryBadge expiryDate="2026-08-19" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('counts calendar days to the expiry', () => {
    render(<ExpiryBadge expiryDate="2026-08-27" />);
    expect(screen.getByText('Expires in 7d')).toBeInTheDocument();
  });
});

describe('CurrencyExpiryBanner west of UTC', () => {
  beforeEach(() => {
    process.env.TZ = 'America/New_York';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 19, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTz;
  });

  it('counts the flight review days by calendar day', () => {
    const flightReview = { status: 'expiring', expiresOn: '2026-08-20' } as FlightReviewStatus;
    render(<CurrencyExpiryBanner ratings={[]} flightReview={flightReview} />);
    expect(screen.getByText('Expires in 1 days')).toBeInTheDocument();
  });
});
