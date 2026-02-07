import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLicenses } from '../hooks/useLicenses';
import { useLicenseStore } from '../stores/licenseStore';
import { useFlights } from '../hooks/useFlights';
import { useLicenseStatistics, useLicenseCurrency } from '../hooks/useStatistics';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: licenses } = useLicenses();
  const { activeLicense, setActiveLicense } = useLicenseStore();
  const navigate = useNavigate();

  // Auto-select first license if none is active
  useEffect(() => {
    if (!activeLicense && licenses && licenses.length > 0) {
      setActiveLicense(licenses[0]);
    }
  }, [activeLicense, licenses, setActiveLicense]);

  const { data: flightsData } = useFlights({
    licenseId: activeLicense?.id,
    page: 1,
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const { data: statistics } = useLicenseStatistics(activeLicense?.id || '');
  const { data: currency } = useLicenseCurrency(activeLicense?.id || '');

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

      {/* Currency Status */}
      {currency && (
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold mb-4">Currency Status (Last 90 Days)</h2>

          {/* Overall status banner */}
          <div className={`rounded-lg px-4 py-3 mb-4 ${
            currency.isCurrent
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-lg ${currency.isCurrent ? 'text-green-600' : 'text-red-600'}`}>
                {currency.isCurrent ? '✓' : '✗'}
              </span>
              <span className={`font-semibold ${currency.isCurrent ? 'text-green-800' : 'text-red-800'}`}>
                {currency.isCurrent ? 'Current — cleared to carry passengers' : 'Not current — complete required landings'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Day currency */}
            <div className={`rounded-lg p-4 ${
              currency.daysCurrent ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Day Currency</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  currency.daysCurrent
                    ? 'bg-green-200 text-green-800'
                    : 'bg-red-200 text-red-800'
                }`}>
                  {currency.daysCurrent ? 'CURRENT' : 'NOT CURRENT'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currency.last90Days.dayLandings}
                <span className="text-sm font-normal text-gray-500">
                  {' '}/ {currency.requiredLandings?.day ?? 3} landings
                </span>
              </p>
              {!currency.daysCurrent && (
                <p className="text-xs text-red-600 mt-1">
                  Need {(currency.requiredLandings?.day ?? 3) - currency.last90Days.dayLandings} more day landing{(currency.requiredLandings?.day ?? 3) - currency.last90Days.dayLandings !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Night currency */}
            <div className={`rounded-lg p-4 ${
              currency.nightsCurrent ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Night Currency</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  currency.nightsCurrent
                    ? 'bg-green-200 text-green-800'
                    : 'bg-amber-200 text-amber-800'
                }`}>
                  {currency.nightsCurrent ? 'CURRENT' : 'NOT CURRENT'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currency.last90Days.nightLandings}
                <span className="text-sm font-normal text-gray-500">
                  {' '}/ {currency.requiredLandings?.night ?? 3} landings
                </span>
              </p>
              {!currency.nightsCurrent && currency.requiredLandings?.night !== 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Need {(currency.requiredLandings?.night ?? 3) - currency.last90Days.nightLandings} more night landing{(currency.requiredLandings?.night ?? 3) - currency.last90Days.nightLandings !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-400 text-center">
            {currency.last90Days.flights} flight{currency.last90Days.flights !== 1 ? 's' : ''} in the last 90 days &middot;
            {' '}{currency.last90Days.totalLandings} total landing{currency.last90Days.totalLandings !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Hours breakdown */}
      {statistics && statistics.totalHours > 0 && (
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold mb-4">Hours Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
            {[
              { label: 'PIC', value: statistics.picHours },
              { label: 'Dual', value: statistics.dualHours },
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
