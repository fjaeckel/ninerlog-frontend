import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLicenses } from '../hooks/useLicenses';
import { useLicenseStore } from '../stores/licenseStore';
import { useFlights } from '../hooks/useFlights';
import { useLicenseStatistics } from '../hooks/useStatistics';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: licenses } = useLicenses();
  const { activeLicense } = useLicenseStore();
  const navigate = useNavigate();

  const { data: flightsData } = useFlights({
    licenseId: activeLicense?.id,
    page: 1,
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const { data: statistics } = useLicenseStatistics(activeLicense?.id || '');

  const recentFlights = flightsData?.data || [];
  const totalFlights = flightsData?.pagination?.total || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name || user?.email}!</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Licenses</h2>
          <p className="text-3xl font-bold text-primary-600">{licenses?.length || 0}</p>
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Total Flights</h2>
          <p className="text-3xl font-bold text-primary-600">{statistics?.totalFlights ?? totalFlights}</p>
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Flight Hours</h2>
          <p className="text-3xl font-bold text-primary-600">{statistics?.totalHours?.toFixed(1) ?? '0.0'}</p>
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Landings</h2>
          <p className="text-3xl font-bold text-primary-600">
            {(statistics?.landingsDay ?? 0) + (statistics?.landingsNight ?? 0)}
          </p>
        </div>
      </div>

      {/* Hours breakdown */}
      {statistics && statistics.totalHours > 0 && (
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold mb-4">Hours Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
            {[
              { label: 'PIC', value: statistics.picHours },
              { label: 'Dual', value: statistics.dualHours },
              { label: 'Solo', value: statistics.soloHours },
              { label: 'Night', value: statistics.nightHours },
              { label: 'IFR', value: statistics.ifrHours },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-gray-800">{value.toFixed(1)}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Flights */}
      <div className="mt-6 card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Flights</h2>
          {totalFlights > 0 && (
            <button onClick={() => navigate('/flights')} className="text-sm text-primary-600 hover:text-primary-700">
              View all →
            </button>
          )}
        </div>
        {recentFlights.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentFlights.map((flight) => (
              <button
                key={flight.id}
                onClick={() => navigate(`/flights/${flight.id}`)}
                className="w-full flex justify-between items-center py-3 hover:bg-gray-50 rounded px-2 text-left"
              >
                <div>
                  <span className="font-medium">
                    {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
                  </span>
                  <span className="ml-3 text-sm text-gray-500">{flight.aircraftReg}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{flight.totalTime.toFixed(1)}h</span>
                  <span className="ml-3 text-sm text-gray-500">{flight.date}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No flights logged yet.</p>
        )}
      </div>

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/flights', { state: { openForm: true } })} className="btn-primary">
            Log New Flight
          </button>
          <button onClick={() => navigate('/flights')} className="btn-secondary">
            View All Flights
          </button>
        </div>
      </div>
    </div>
  );
}
