import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import FlightRouteCard from '../../components/flights/FlightRouteCard';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const baseFlight: Flight = {
  id: 'flight-1',
  userId: 'user-1',
  date: '2020-09-06',
  aircraftReg: 'D-ETWL',
  aircraftType: 'A210',
  departureIcao: 'EDQE',
  arrivalIcao: 'EDAZ',
  departureTime: '12:39:00',
  arrivalTime: '14:19:00',
  offBlockTime: '12:28:00',
  onBlockTime: '14:23:00',
  totalTime: 115,
  isSimulator: false,
  isPassenger: false,
  isPic: true,
  isDual: false,
  picTime: 115,
  dualTime: 0,
  nightTime: 0,
  ifrTime: 0,
  landingsDay: 1,
  landingsNight: 0,
  allLandings: 1,
  takeoffsDay: 1,
  takeoffsNight: 0,
  soloTime: 0,
  crossCountryTime: 115,
  distance: 163.7,
  sicTime: 0,
  dualGivenTime: 0,
  simulatedFlightTime: 0,
  groundTrainingTime: 0,
  createdAt: '2020-09-06T00:00:00Z',
  updatedAt: '2020-09-06T00:00:00Z',
};

describe('FlightRouteCard', () => {
  it('shows the aircraft registration and type', () => {
    render(<FlightRouteCard flight={baseFlight} />);

    expect(screen.getByText('D-ETWL')).toBeInTheDocument();
    expect(screen.getByText('A210')).toBeInTheDocument();
  });

  it('renders code and airport name as separate elements so long names can wrap', () => {
    render(
      <FlightRouteCard
        flight={{
          ...baseFlight,
          departureAirportName: 'Burg Feuerstein Airport',
          arrivalAirportName: 'Jena-Schöngleina Airfield',
        }}
      />
    );

    expect(screen.getByText('EDQE')).toBeInTheDocument();
    expect(screen.getByText('Burg Feuerstein Airport')).toBeInTheDocument();
    expect(screen.getByText('EDAZ')).toBeInTheDocument();
    expect(screen.getByText('Jena-Schöngleina Airfield')).toBeInTheDocument();
  });

  it('groups the block and airborne times with their end of the route', () => {
    render(<FlightRouteCard flight={baseFlight} />);

    const [departure, arrival] = screen.getAllByRole('listitem');

    expect(within(departure).getByText('12:28')).toBeInTheDocument();
    expect(within(departure).getByText('12:39')).toBeInTheDocument();
    expect(within(arrival).getByText('14:19')).toBeInTheDocument();
    expect(within(arrival).getByText('14:23')).toBeInTheDocument();
  });

  it('omits times the flight does not record', () => {
    render(<FlightRouteCard flight={{ ...baseFlight, offBlockTime: null, onBlockTime: null }} />);

    expect(screen.queryByText('Off-Block')).not.toBeInTheDocument();
    expect(screen.queryByText('On-Block')).not.toBeInTheDocument();
    expect(screen.getByText('Takeoff')).toBeInTheDocument();
    expect(screen.getByText('Landing')).toBeInTheDocument();
  });

  it('shows the distance on the leg between the two stops', () => {
    render(<FlightRouteCard flight={baseFlight} />);

    expect(screen.getByText(/163\.7 NM/)).toBeInTheDocument();
  });

  it('hides the distance when the API could not compute one', () => {
    render(<FlightRouteCard flight={{ ...baseFlight, distance: 0 }} />);

    expect(screen.queryByText(/NM/)).not.toBeInTheDocument();
  });

  it('renders off-airport sites as a name without a code', () => {
    render(
      <FlightRouteCard flight={{ ...baseFlight, departureIcao: 'Meadow strip near Kassel' }} />
    );

    expect(screen.getByText('Meadow strip near Kassel')).toBeInTheDocument();
    expect(screen.queryByText('EDQE')).not.toBeInTheDocument();
  });

  it('shows route and launch method only when the flight has them', () => {
    const { rerender } = render(<FlightRouteCard flight={baseFlight} />);
    expect(screen.queryByText('Route')).not.toBeInTheDocument();

    rerender(
      <FlightRouteCard flight={{ ...baseFlight, route: 'EDQE DKB EDAZ', launchMethod: 'winch' }} />
    );
    expect(screen.getByText('Route')).toBeInTheDocument();
    expect(screen.getByText('EDQE DKB EDAZ')).toBeInTheDocument();
    expect(screen.getByText('Launch Method')).toBeInTheDocument();
  });
});
