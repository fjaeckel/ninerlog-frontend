import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlightRouteHeading from '../../components/flights/FlightRouteHeading';
import { splitAirportLabel } from '../../lib/airport';

const parts = (location: string | null, name: string | null = null) =>
  splitAirportLabel(location, name);

describe('FlightRouteHeading', () => {
  it('sets two ICAO codes on one line in the tabular face', () => {
    render(<FlightRouteHeading departure={parts('EDDF')} arrival={parts('EDDH')} />);

    const departure = screen.getByText('EDDF');
    expect(departure).toBeInTheDocument();
    expect(screen.getByText('EDDH')).toBeInTheDocument();
    expect(departure.closest('p')).toHaveClass('font-mono');
  });

  it('keeps the arrow with the arrival so it cannot be stranded on its own line', () => {
    render(
      <FlightRouteHeading
        departure={parts('Meadow strip near Kassel')}
        arrival={parts('North field, Bad Hersfeld-Johannesberg')}
      />
    );

    const arrival = screen.getByText('North field, Bad Hersfeld-Johannesberg');
    expect(arrival.parentElement).toHaveTextContent('→ North field, Bad Hersfeld-Johannesberg');
    expect(arrival.parentElement).not.toHaveTextContent('Meadow strip near Kassel');
  });

  it('sets a free-text site in the UI face, not the tabular one', () => {
    render(<FlightRouteHeading departure={parts('Meadow strip near Kassel')} arrival={parts('EDVK')} />);

    expect(screen.getByText('Meadow strip near Kassel')).toHaveClass('font-sans');
    // A real code beside it keeps the tabular face
    expect(screen.getByText('EDVK')).toHaveClass('font-mono');
  });

  it('renders as a heading when the page needs one', () => {
    render(<FlightRouteHeading as="h1" size="page" departure={parts('EDDF')} arrival={parts('EDDH')} />);

    // The gap between the codes is layout, not a space character
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('EDDF→EDDH');
  });

  it('falls back to a dash for a missing location', () => {
    render(<FlightRouteHeading departure={parts(null)} arrival={parts(null)} />);

    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
