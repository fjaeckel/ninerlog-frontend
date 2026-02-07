import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlightCard from '../../components/flights/FlightCard';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const mockFlight: Flight = {
  id: 'flight-1',
  userId: 'user-1',
  licenseId: 'lic-1',
  date: '2026-01-15',
  aircraftReg: 'D-EFGH',
  aircraftType: 'C172',
  departureIcao: 'EDDF',
  arrivalIcao: 'EDDH',
  departureTime: '14:30:00',
  arrivalTime: '16:00:00',
  offBlockTime: '14:15:00',
  onBlockTime: '16:10:00',
  totalTime: 1.5,
  isPic: true,
  isDual: false,
  picTime: 1.5,
  dualTime: 0,
  soloTime: 0,
  nightTime: 0.5,
  ifrTime: 0,
  landingsDay: 2,
  landingsNight: 1,
  remarks: 'Training flight',
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
};

describe('FlightCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClick = vi.fn();

  it('renders route information', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText(/EDDF → EDDH/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
  });

  it('renders total time badge', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    const badges = screen.getAllByText('1.5h');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders aircraft information', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('D-EFGH')).toBeInTheDocument();
    expect(screen.getByText('C172')).toBeInTheDocument();
  });

  it('renders PIC time when greater than 0', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText(/PIC:/)).toBeInTheDocument();
  });

  it('renders night time when greater than 0', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('0.5h')).toBeInTheDocument();
  });

  it('renders landing counts', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('2D / 1N')).toBeInTheDocument();
  });

  it('renders remarks when present', () => {
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('Training flight')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    await user.click(screen.getByText(/EDDF → EDDH/));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FlightCard
        flight={mockFlight}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('shows dashes for missing ICAO codes', () => {
    const flightWithoutIcao = {
      ...mockFlight,
      departureIcao: null,
      arrivalIcao: null,
    };

    render(
      <FlightCard
        flight={flightWithoutIcao}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText(/— → —/)).toBeInTheDocument();
  });

  it('hides time fields that are 0', () => {
    const flightNoExtras = {
      ...mockFlight,
      dualTime: 0,
      soloTime: 0,
      nightTime: 0,
      ifrTime: 0,
    };

    render(
      <FlightCard
        flight={flightNoExtras}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onClick={mockOnClick}
      />
    );

    expect(screen.queryByText(/Dual:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/IFR:/)).not.toBeInTheDocument();
  });
});
