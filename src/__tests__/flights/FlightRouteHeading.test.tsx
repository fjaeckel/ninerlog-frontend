import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlightRouteHeading from '../../components/flights/FlightRouteHeading';
import { splitAirportLabel } from '../../lib/airport';

const parts = (location: string | null, name: string | null = null) =>
  splitAirportLabel(location, name);

describe('FlightRouteHeading', () => {
  it('sets ICAO codes in the tabular face', () => {
    render(<FlightRouteHeading departure={parts('EDDF')} arrival={parts('EDDH')} />);

    expect(screen.getByText('EDDF')).toHaveClass('font-mono');
    expect(screen.getByText('EDDH')).toHaveClass('font-mono');
  });

  it('sets a free-text site in the UI face, not the tabular one', () => {
    render(<FlightRouteHeading departure={parts('Home strip')} arrival={parts('EDVK')} />);

    expect(screen.getByText('Home strip')).toHaveClass('font-sans');
    expect(screen.getByText('EDVK')).toHaveClass('font-mono');
  });

  it('abbreviates a long site name in a list row and keeps the full one in a title', () => {
    render(
      <FlightRouteHeading departure={parts('Meadow strip near Kassel')} arrival={parts('EDVK')} />
    );

    const departure = screen.getByText('Meadow…');
    expect(departure).toBeInTheDocument();
    expect(departure).toHaveAttribute('title', 'Meadow strip near Kassel');
  });

  it('leaves a site name alone when it already fits', () => {
    render(<FlightRouteHeading departure={parts('Home strip')} arrival={parts('EDQE')} />);

    expect(screen.getByText('Home strip')).toBeInTheDocument();
  });

  it('gives both ends the same budget, so a column of rows reads as one list', () => {
    render(
      <FlightRouteHeading
        departure={parts('Meadow strip near Kassel')}
        arrival={parts('North field, Bad Hersfeld-Johannesberg')}
      />
    );

    // Same treatment as a name sitting beside a code: whole words, and the
    // town the site is near dropped at the comma.
    expect(screen.getByText('Meadow…')).toBeInTheDocument();
    expect(screen.getByText('North field')).toBeInTheDocument();
  });

  it('gives the detail page the names in full', () => {
    render(
      <FlightRouteHeading
        as="h1"
        size="page"
        departure={parts('Meadow strip near Kassel')}
        arrival={parts('North field, Bad Hersfeld-Johannesberg')}
      />
    );

    expect(screen.getByText('Meadow strip near Kassel')).toBeInTheDocument();
    const arrival = screen.getByText('North field, Bad Hersfeld-Johannesberg');
    // The arrow stays with the arrival so it cannot be stranded on its own line
    expect(arrival.parentElement?.querySelector('svg')).toBeInTheDocument();
    expect(arrival.parentElement).toHaveTextContent('North field, Bad Hersfeld-Johannesberg');
    expect(arrival.parentElement).not.toHaveTextContent('Meadow strip near Kassel');
  });

  it('renders as a heading when the page needs one', () => {
    render(<FlightRouteHeading as="h1" size="page" departure={parts('EDDF')} arrival={parts('EDDH')} />);

    // The gap between the codes is layout, not a space character; the arrow is an icon
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('EDDFEDDH');
  });

  it('falls back to a dash for a missing location', () => {
    render(<FlightRouteHeading departure={parts(null)} arrival={parts(null)} />);

    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
