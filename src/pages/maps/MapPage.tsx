import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useFlightRoutes, useAirportStats } from '../../hooks/useMaps';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import 'leaflet/dist/leaflet.css';

// Fit map bounds to all markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  if (positions.length > 1) {
    map.fitBounds(positions, { padding: [40, 40] });
  } else if (positions.length === 1) {
    map.setView(positions[0], 6);
  }
  return null;
}

type MapView = 'routes' | 'heatmap';

export default function MapPage() {
  const { t } = useTranslation('reports');
  const { data: routeData, isLoading: routesLoading } = useFlightRoutes();
  const { data: airportStats, isLoading: statsLoading } = useAirportStats();
  const [view, setView] = useState<MapView>('routes');

  const isLoading = routesLoading || statsLoading;
  const isError = !isLoading && (!routeData && !airportStats);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] py-6">
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] py-6">
        <ErrorState
          title={t('map.failedToLoad', 'Failed to load map data')}
          message={t('map.failedToLoadMessage', 'An error occurred while loading your flight routes. Please try again.')}
        />
      </div>
    );
  }

  const routes = routeData?.routes ?? [];
  const stats = airportStats ?? [];
  const hasData = routes.length > 0 || stats.length > 0;

  // Collect all positions for map bounds
  const allPositions: [number, number][] = [];
  if (view === 'routes') {
    routes.forEach((r) => {
      allPositions.push([r.departureCoords.lat, r.departureCoords.lng]);
      allPositions.push([r.arrivalCoords.lat, r.arrivalCoords.lng]);
    });
  } else {
    stats.forEach((s) => {
      if (s.latitude && s.longitude) {
        allPositions.push([s.latitude, s.longitude]);
      }
    });
  }

  // Default center (Europe) if no data
  const defaultCenter: [number, number] = [50, 10];
  const maxFlights = Math.max(...stats.map((s) => s.totalFlights), 1);

  return (
    <div className="mx-auto max-w-[1280px] py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{t('map.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {hasData
              ? `${routes.length} ${t('map.routes', 'routes')} · ${stats.length} ${t('map.airports', 'airports')}`
              : t('map.noRoutes')}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setView('routes')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'routes'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Routes
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'heatmap'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {t('map.heatmap')}
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="card text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-2">{t('map.noRoutes')}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t('map.noRoutesHint', 'Log flights with departure and arrival ICAO codes to see your routes on the map.')}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden rounded-xl relative z-0" style={{ height: '65vh', minHeight: '400px' }}>
          <MapContainer
            center={allPositions.length > 0 ? allPositions[0] : defaultCenter}
            zoom={5}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {allPositions.length > 0 && <FitBounds positions={allPositions} />}

            {view === 'routes' && (
              <>
                {/* Route lines */}
                {routes.map((route, idx) => (
                  <Polyline
                    key={`route-${idx}`}
                    positions={[
                      [route.departureCoords.lat, route.departureCoords.lng],
                      [route.arrivalCoords.lat, route.arrivalCoords.lng],
                    ]}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: Math.min(1 + route.flightCount, 6),
                      opacity: 0.7,
                    }}
                  >
                    <Tooltip>
                      {route.departureIcao} → {route.arrivalIcao} ({t('map.flightCount', { count: route.flightCount })})
                    </Tooltip>
                  </Polyline>
                ))}

                {/* Airport markers for routes */}
                {(routeData?.airports ?? []).map((ap) => (
                  <CircleMarker
                    key={`ap-${ap.icao}`}
                    center={[ap.latitude, ap.longitude]}
                    radius={6}
                    pathOptions={{
                      color: '#1e40af',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Tooltip>
                      <strong>{ap.icao}</strong> — {ap.name}
                      {ap.country ? ` (${ap.country})` : ''}
                    </Tooltip>
                  </CircleMarker>
                ))}
              </>
            )}

            {view === 'heatmap' && (
              <>
                {/* Activity heatmap — circle size proportional to flight count */}
                {stats.map((s) => {
                  if (!s.latitude || !s.longitude) return null;
                  const intensity = s.totalFlights / maxFlights;
                  const radius = 6 + intensity * 20;
                  return (
                    <CircleMarker
                      key={`stat-${s.icao}`}
                      center={[s.latitude, s.longitude]}
                      radius={radius}
                      pathOptions={{
                        color: intensity > 0.5 ? '#dc2626' : intensity > 0.25 ? '#f59e0b' : '#3b82f6',
                        fillColor: intensity > 0.5 ? '#ef4444' : intensity > 0.25 ? '#fbbf24' : '#60a5fa',
                        fillOpacity: 0.6,
                        weight: 2,
                      }}
                    >
                      <Tooltip>
                        <strong>{s.icao}</strong> — {s.name}
                        <br />
                        {s.departures} dep · {s.arrivals} arr · {s.totalFlights} total
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </>
            )}
          </MapContainer>
        </div>
      )}

      {/* Airport stats table */}
      {stats.length > 0 && (
        <div className="card mt-6">
          <h2 className="section-title mb-4">{t('map.statistics')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">ICAO</th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Name</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Departures</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Arrivals</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...stats]
                  .sort((a, b) => b.totalFlights - a.totalFlights)
                  .map((s) => (
                    <tr key={s.icao} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">{s.icao}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{s.name}</td>
                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-mono tabular-nums">{s.departures}</td>
                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-mono tabular-nums">{s.arrivals}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200 font-mono tabular-nums">{s.totalFlights}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
