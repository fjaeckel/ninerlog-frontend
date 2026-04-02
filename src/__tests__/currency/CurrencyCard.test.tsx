import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyCard } from '../../components/currency/CurrencyCard';
import type { ClassRatingCurrency } from '../../types/api';

describe('CurrencyCard', () => {
  const baseRating: ClassRatingCurrency = {
    classRatingId: 'cr-1',
    classType: 'SEP_LAND',
    licenseId: 'lic-1',
    regulatoryAuthority: 'EASA',
    licenseType: 'PPL',
    status: 'current',
    message: 'EASA SEP_LAND current — all revalidation requirements met',
    expiryDate: '2027-06-15',
    requirements: [
      { name: 'Total Hours', met: true, current: 15, required: 12, unit: 'hours', message: '15.0 / 12.0 hours in class' },
      { name: 'PIC Hours', met: true, current: 8, required: 6, unit: 'hours', message: '8.0 / 6.0 PIC hours' },
      { name: 'Takeoffs & Landings', met: true, current: 20, required: 12, unit: 'landings', message: '20 / 12 takeoffs & landings' },
      { name: 'Refresher Training', met: true, current: 2, required: 1, unit: 'hours', message: '2.0 / 1.0 hours with instructor' },
    ],
  };

  it('renders class type label', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByText('SEP (Land)')).toBeInTheDocument();
  });

  it('renders authority and license type', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByText('EASA PPL')).toBeInTheDocument();
  });

  it('shows CURRENT badge for current status', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
  });

  it('shows ATTENTION badge for expiring status', () => {
    const rating: ClassRatingCurrency = {
      ...baseRating,
      status: 'expiring',
      message: 'EASA SEP_LAND — revalidation requirements not fully met',
      requirements: [
        { name: 'Total Hours', met: true, current: 15, required: 12, unit: 'hours', message: '15.0 / 12.0 hours' },
        { name: 'PIC Hours', met: false, current: 3, required: 6, unit: 'hours', message: '3.0 / 6.0 PIC hours' },
      ],
    };
    render(<CurrencyCard rating={rating} />);
    expect(screen.getByText('ATTENTION')).toBeInTheDocument();
  });

  it('shows NOT CURRENT badge for expired status', () => {
    const rating: ClassRatingCurrency = {
      ...baseRating,
      status: 'expired',
      message: 'EASA SEP_LAND expired on 2026-01-15',
    };
    render(<CurrencyCard rating={rating} />);
    expect(screen.getByText('NOT CURRENT')).toBeInTheDocument();
  });

  it('shows UNKNOWN badge for unknown status', () => {
    const rating: ClassRatingCurrency = {
      ...baseRating,
      status: 'unknown',
      message: 'EASA SEP_LAND — no expiry date set',
      expiryDate: undefined,
      requirements: [],
    };
    render(<CurrencyCard rating={rating} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders status message', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByText(baseRating.message)).toBeInTheDocument();
  });

  it('renders all requirements with progress bars', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByTestId('requirement-Total Hours')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-PIC Hours')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-Takeoffs & Landings')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-Refresher Training')).toBeInTheDocument();
  });

  it('shows requirement messages', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByText('15.0 / 12.0 hours in class')).toBeInTheDocument();
    expect(screen.getByText('8.0 / 6.0 PIC hours')).toBeInTheDocument();
    expect(screen.getByText('20 / 12 takeoffs & landings')).toBeInTheDocument();
    expect(screen.getByText('2.0 / 1.0 hours with instructor')).toBeInTheDocument();
  });

  it('renders progress bars with correct widths', () => {
    render(<CurrencyCard rating={baseRating} />);
    // Total Hours: 15/12 = 100% (capped at 100)
    const totalBar = screen.getByTestId('progress-bar-Total Hours');
    expect(totalBar).toHaveStyle({ width: '100%' });

    // PIC Hours: 8/6 = 100% (capped)
    const picBar = screen.getByTestId('progress-bar-PIC Hours');
    expect(picBar).toHaveStyle({ width: '100%' });
  });

  it('renders partial progress bar for unmet requirements', () => {
    const rating: ClassRatingCurrency = {
      ...baseRating,
      status: 'expiring',
      requirements: [
        { name: 'PIC Hours', met: false, current: 3, required: 6, unit: 'hours', message: '3.0 / 6.0 PIC hours' },
      ],
    };
    render(<CurrencyCard rating={rating} />);
    const bar = screen.getByTestId('progress-bar-PIC Hours');
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('renders expiry date', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.getByText('Expires: 2027-06-15')).toBeInTheDocument();
  });

  it('does not render expiry date when missing', () => {
    const rating: ClassRatingCurrency = {
      ...baseRating,
      expiryDate: undefined,
    };
    render(<CurrencyCard rating={rating} />);
    expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
  });

  it('renders FAA passenger currency card', () => {
    const faaRating: ClassRatingCurrency = {
      classRatingId: 'cr-2',
      classType: 'SEP_LAND',
      licenseId: 'lic-2',
      regulatoryAuthority: 'FAA',
      licenseType: 'PPL',
      status: 'current',
      message: 'FAA SEP_LAND — current for day and night passengers',
      requirements: [
        { name: 'Day Passenger Currency', met: true, current: 5, required: 3, unit: 'landings', message: '5 / 3 takeoffs & landings in 90 days' },
        { name: 'Night Passenger Currency', met: true, current: 4, required: 3, unit: 'landings', message: '4 / 3 night full-stop landings in 90 days' },
      ],
    };
    render(<CurrencyCard rating={faaRating} />);
    expect(screen.getByText('FAA PPL')).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-Day Passenger Currency')).toBeInTheDocument();
    expect(screen.getByTestId('requirement-Night Passenger Currency')).toBeInTheDocument();
  });

  it('renders FAA night not current card as ATTENTION', () => {
    const faaRating: ClassRatingCurrency = {
      classRatingId: 'cr-3',
      classType: 'SEP_LAND',
      licenseId: 'lic-3',
      regulatoryAuthority: 'FAA',
      licenseType: 'PPL',
      status: 'expiring',
      message: 'FAA SEP_LAND — day current, night not current',
      requirements: [
        { name: 'Day Passenger Currency', met: true, current: 4, required: 3, unit: 'landings', message: '4 / 3 T&L' },
        { name: 'Night Passenger Currency', met: false, current: 1, required: 3, unit: 'landings', message: '1 / 3 night T&L' },
      ],
    };
    render(<CurrencyCard rating={faaRating} />);
    expect(screen.getByText('ATTENTION')).toBeInTheDocument();
  });

  it('renders IR class type with correct label', () => {
    const irRating: ClassRatingCurrency = {
      classRatingId: 'cr-4',
      classType: 'IR',
      licenseId: 'lic-4',
      regulatoryAuthority: 'EASA',
      licenseType: 'PPL',
      status: 'current',
      message: 'EASA IR current',
      requirements: [
        { name: 'IFR Hours', met: true, current: 15, required: 10, unit: 'hours', message: '15.0 / 10.0 IFR hours' },
      ],
    };
    render(<CurrencyCard rating={irRating} />);
    expect(screen.getByText('Instrument Rating')).toBeInTheDocument();
  });

  it('renders without requirements', () => {
    const rating: ClassRatingCurrency = {
      ...baseRating,
      requirements: undefined,
    };
    render(<CurrencyCard rating={rating} />);
    expect(screen.getByText('SEP (Land)')).toBeInTheDocument();
    // No progress bars should be rendered
    expect(screen.queryByTestId('requirement-Total Hours')).not.toBeInTheDocument();
  });

  it('renders launch method currency for SPL', () => {
    const splRating: ClassRatingCurrency = {
      ...baseRating,
      licenseType: 'SPL',
      launchMethodCurrency: [
        { method: 'winch', launches: 8, required: 5, met: true, message: '8 / 5 winch launches' },
        { method: 'aerotow', launches: 3, required: 5, met: false, message: '3 / 5 aerotow launches' },
      ],
    };
    render(<CurrencyCard rating={splRating} />);
    expect(screen.getByTestId('launch-method-currency')).toBeInTheDocument();
    expect(screen.getByTestId('launch-method-winch')).toBeInTheDocument();
    expect(screen.getByTestId('launch-method-aerotow')).toBeInTheDocument();
    expect(screen.getByTestId('launch-method-winch')).toHaveTextContent('8 / 5');
    expect(screen.getByTestId('launch-method-aerotow')).toHaveTextContent('3 / 5');
  });

  it('does not render launch method section when absent', () => {
    render(<CurrencyCard rating={baseRating} />);
    expect(screen.queryByTestId('launch-method-currency')).not.toBeInTheDocument();
  });
});
