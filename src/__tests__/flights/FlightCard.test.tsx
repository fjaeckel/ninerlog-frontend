import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlightCard from '../../components/flights/FlightCard';
import {
  selectFlightCardColumns,
  type FlightColumnKey,
} from '../../components/flights/flightTableColumns';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const mockFlight: Flight = {
  id: 'flight-1',
  userId: 'user-1',
  date: '2026-01-15',
  aircraftReg: 'D-EFGH',
  aircraftType: 'C172',
  departureIcao: 'EDDF',
  arrivalIcao: 'EDDH',
  departureTime: '14:30:00',
  arrivalTime: '16:00:00',
  offBlockTime: '14:15:00',
  onBlockTime: '16:10:00',
  totalTime: 90,
  isSimulator: false,
  isPassenger: false,
  isPic: true,
  isDual: false,
  picTime: 90,
  dualTime: 0,
  nightTime: 30,
  ifrTime: 0,
  landingsDay: 2,
  landingsNight: 1,
  allLandings: 3,
  takeoffsDay: 2,
  takeoffsNight: 1,
  soloTime: 90,
  crossCountryTime: 90,
  distance: 185.3,
  remarks: 'Training flight',
  sicTime: 0,
  dualGivenTime: 0,
  simulatedFlightTime: 0,
  groundTrainingTime: 0,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
};

function renderCard(overrides: Partial<Flight> = {}, onClick: () => void = vi.fn()) {
  const flight = { ...mockFlight, ...overrides };
  // The page picks the columns; a one-flight page picks them from this flight.
  render(<FlightCard flight={flight} columns={selectFlightCardColumns([flight])} onClick={onClick} />);
  return { onClick };
}

describe('FlightCard', () => {
  it('leads with the two ends of the route and the time recorded at each', () => {
    renderCard();

    expect(screen.getByText('EDDF')).toBeInTheDocument();
    expect(screen.getByText('EDDH')).toBeInTheDocument();
    expect(screen.getByText('14:15')).toBeInTheDocument();
    expect(screen.getByText('16:10')).toBeInTheDocument();
  });

  it('falls back to the airborne times when no block times were recorded', () => {
    renderCard({ offBlockTime: null, onBlockTime: null });

    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });

  it('renders an off-airport site as an abbreviated name without a code', () => {
    renderCard({ departureIcao: 'Meadow strip near Kassel' });

    // The row is one line: the name is shortened, the full one is in the title
    expect(screen.getByText('Meadow…')).toHaveAttribute('title', 'Meadow strip near Kassel');
    expect(screen.queryByText('EDDF')).not.toBeInTheDocument();
  });

  it('renders the date and the block time', () => {
    renderCard();

    expect(screen.getByText('15.01.2026')).toBeInTheDocument();
    // Also the value of the solo and cross-country chips on this flight
    expect(screen.getAllByText('1h 30m').length).toBeGreaterThanOrEqual(1);
  });

  it('renders aircraft information', () => {
    renderCard();

    expect(screen.getByText('D-EFGH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Flight EDDF/ })).toHaveTextContent('C172');
  });

  it('shows the pilot function', () => {
    renderCard();
    expect(screen.getByText('PIC')).toBeInTheDocument();
  });

  it('renders the time columns the page gave it', () => {
    renderCard();

    expect(screen.getByText('Night')).toBeInTheDocument();
    expect(screen.getByText('0h 30m')).toBeInTheDocument();
    expect(screen.queryByText('IFR')).not.toBeInTheDocument();
  });

  it('drops a time column no flight on the page uses', () => {
    renderCard({ nightTime: 0, ifrTime: 0, soloTime: 0, crossCountryTime: 0 });

    expect(screen.queryByText('Night')).not.toBeInTheDocument();
    expect(screen.queryByText('Solo')).not.toBeInTheDocument();
    expect(screen.queryByText('XC')).not.toBeInTheDocument();
  });

  it('keeps a page column and dashes it when this flight logged none of it', () => {
    // A page where another flight flew at night: the column stays, this card
    // shows a dash rather than dropping a column and shifting the others.
    const columns = selectFlightCardColumns([mockFlight]);
    render(
      <FlightCard flight={{ ...mockFlight, nightTime: 0 }} columns={columns} onClick={vi.fn()} />
    );

    expect(screen.getByText('Night')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('splits the landings by day and night once a flight on the page has some', () => {
    renderCard();
    expect(screen.getByText('Ldg D/N')).toBeInTheDocument();
    expect(screen.getByText('2/1')).toBeInTheDocument();
  });

  it('shows a single landing count when no flight on the page landed at night', () => {
    renderCard({ landingsNight: 0, allLandings: 2 });
    expect(screen.getByText('Ldg')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('marks a signed flight', () => {
    renderCard({ signatureId: 'sig-1' });
    expect(screen.getByText('Signed')).toBeInTheDocument();
  });

  it('leaves remarks to the detail page', () => {
    renderCard();
    expect(screen.queryByText('Training flight')).not.toBeInTheDocument();
  });

  it('calls onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    const { onClick } = renderCard();

    await user.click(screen.getByText('EDDF'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('leaves editing and deleting to the detail page', () => {
    renderCard();

    // The row is a single tap target; nothing on it competes with opening the
    // flight, and nothing destructive sits under a thumb scrolling a list.
    expect(screen.queryByRole('button', { name: /edit flight/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete flight/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('drops the columns the flights-list setting switches off', () => {
    // Custom mode with only night time picked: no off/on pair, no landings,
    // no function badge — the same answer the table gives.
    const custom = { mode: 'custom' as const, columns: ['nightTime'] as FlightColumnKey[] };
    render(
      <FlightCard
        flight={mockFlight}
        columns={selectFlightCardColumns([mockFlight], custom)}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryByText('Off')).not.toBeInTheDocument();
    expect(screen.queryByText('On')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ldg/)).not.toBeInTheDocument();
    expect(screen.queryByText('PIC')).not.toBeInTheDocument();
    expect(screen.getByText('Night')).toBeInTheDocument();
  });

  it('drops the readout entirely when the setting leaves nothing in it', () => {
    const none = { mode: 'custom' as const, columns: [] as FlightColumnKey[] };
    const { container } = render(
      <FlightCard
        flight={mockFlight}
        columns={selectFlightCardColumns([mockFlight], none)}
        onClick={vi.fn()}
      />
    );

    expect(container.querySelector('dl')).toBeNull();
    // The identity of the entry survives whatever the setting says
    expect(screen.getByText('EDDF')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('shows dashes for missing ICAO codes', () => {
    renderCard({ departureIcao: null, arrivalIcao: null });

    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
