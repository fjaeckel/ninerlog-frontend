import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapPage from '../../pages/maps/MapPage';
import * as useMapsHook from '../../hooks/useMaps';

// Mock react-leaflet — happy-dom doesn't support canvas/SVG map rendering
vi.mock('react-leaflet', () => {
  const MockMap = ({ children }: any) => <div data-testid="leaflet-map">{children}</div>;
  return {
    MapContainer: MockMap,
    TileLayer: () => null,
    Polyline: ({ children }: any) => <div data-testid="route-line">{children}</div>,
    CircleMarker: ({ children }: any) => <div data-testid="circle-marker">{children}</div>,
    Tooltip: ({ children }: any) => <span>{children}</span>,
    useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
  };
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockRouteData: useMapsHook.FlightRoutesResponse = {
  routes: [
    {
      departureIcao: 'EDDF',
      arrivalIcao: 'EDDH',
      departureCoords: { lat: 50.0333, lng: 8.5706 },
      arrivalCoords: { lat: 53.6304, lng: 9.9882 },
      flightCount: 3,
    },
    {
      departureIcao: 'EDDH',
      arrivalIcao: 'EDDF',
      departureCoords: { lat: 53.6304, lng: 9.9882 },
      arrivalCoords: { lat: 50.0333, lng: 8.5706 },
      flightCount: 2,
    },
  ],
  airports: [
    { icao: 'EDDF', name: 'Frankfurt am Main', latitude: 50.0333, longitude: 8.5706 },
    { icao: 'EDDH', name: 'Hamburg', latitude: 53.6304, longitude: 9.9882 },
  ],
};

const mockAirportStats: useMapsHook.AirportStats[] = [
  { icao: 'EDDF', name: 'Frankfurt am Main', latitude: 50.0333, longitude: 8.5706, departures: 5, arrivals: 3, totalFlights: 8 },
  { icao: 'EDDH', name: 'Hamburg', latitude: 53.6304, longitude: 9.9882, departures: 3, arrivals: 5, totalFlights: 8 },
];

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: undefined, isLoading: true, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: undefined, isLoading: true, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders page title', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByText('Route Map')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: { routes: [], airports: [] }, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByText(/no flight routes to display/i)).toBeInTheDocument();
  });

  it('renders route count and airport count', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByText(/2 routes/)).toBeInTheDocument();
    expect(screen.getByText(/2 airports/)).toBeInTheDocument();
  });

  it('renders map container', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
  });

  it('renders route lines and airport markers', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    const routeLines = screen.getAllByTestId('route-line');
    expect(routeLines.length).toBe(2);
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers.length).toBe(2);
  });

  it('renders view toggle buttons', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByRole('button', { name: /routes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activity/i })).toBeInTheDocument();
  });

  it('switches to activity/heatmap view', async () => {
    const user = userEvent.setup();
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    await user.click(screen.getByRole('button', { name: /activity/i }));

    // In activity view, circle markers should be rendered from airportStats
    const markers = screen.getAllByTestId('circle-marker');
    expect(markers.length).toBe(2);
  });

  it('renders airport statistics table', () => {
    vi.spyOn(useMapsHook, 'useFlightRoutes').mockReturnValue({
      data: mockRouteData, isLoading: false, error: null,
    } as any);
    vi.spyOn(useMapsHook, 'useAirportStats').mockReturnValue({
      data: mockAirportStats, isLoading: false, error: null,
    } as any);

    renderWithProviders(<MapPage />);
    expect(screen.getByText('Airport Statistics')).toBeInTheDocument();
    // ICAO codes appear in both map and table, so use getAllByText
    expect(screen.getAllByText('EDDF').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('EDDH').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Frankfurt am Main').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hamburg').length).toBeGreaterThanOrEqual(1);
  });
});
