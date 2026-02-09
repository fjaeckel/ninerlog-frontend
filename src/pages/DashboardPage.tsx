import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLicenses } from '../hooks/useLicenses';
import { useLicenseStore } from '../stores/licenseStore';
import { useFlights } from '../hooks/useFlights';
import { useLicenseStatistics, useLicenseCurrency } from '../hooks/useStatistics';
import { useCredentials } from '../hooks/useCredentials';

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
  const { data: credentials } = useCredentials();

  const recentFlights = flightsData?.data || [];
  const totalFlights = flightsData?.pagination?.total || 0;

  // Determine if active license is SPL/Sport (no night flying)
  const isSPL = activeLicense?.licenseType === 'EASA_SPL' || activeLicense?.licenseType === 'FAA_SPORT';

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-[1280px] py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">{greeting}, {user?.name || user?.email}!</h1>
        <button
          onClick={() => navigate('/flights', { state: { openForm: true } })}
          className="btn-primary hidden sm:inline-flex"
        >
          + Log Flight
        </button>
      </div>

      {/* Currency Status */}
      {currency && (
        <div className={`card mb-6 border-l-4 ${
          currency.isCurrent ? 'border-l-green-500' : 'border-l-red-500'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title flex items-center gap-2">
              <span>{currency.isCurrent ? '🛡✓' : '🛡✕'}</span>
              {activeLicense?.licenseType.replace('_', ' ')} Currency
            </h2>
            <span className={
              currency.isCurrent ? 'badge-current' : 'badge-expired'
            }>
              {currency.isCurrent ? 'CURRENT' : 'NOT CURRENT'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Day currency */}
            <div className={`rounded-lg p-4 ${
              currency.daysCurrent
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Day Currency</span>
                <span className={`badge ${
                  currency.daysCurrent ? 'badge-current' : 'badge-expired'
                }`}>
                  {currency.daysCurrent ? 'CURRENT' : 'NOT CURRENT'}
                </span>
              </div>
              <p className="data-lg text-slate-800 dark:text-slate-100">
                {currency.last90Days.dayLandings}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {' '}/ {currency.requiredLandings?.day ?? 3} landings
                </span>
              </p>
              {!currency.daysCurrent && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Need {(currency.requiredLandings?.day ?? 3) - currency.last90Days.dayLandings} more day landing{(currency.requiredLandings?.day ?? 3) - currency.last90Days.dayLandings !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Night currency — hidden for SPL/Sport licenses */}
            {!isSPL && (
            <div className={`rounded-lg p-4 ${
              currency.nightsCurrent
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Night Currency</span>
                <span className={`badge ${
                  currency.nightsCurrent ? 'badge-current' : 'badge-expiring'
                }`}>
                  {currency.nightsCurrent ? 'CURRENT' : 'NOT CURRENT'}
                </span>
              </div>
              <p className="data-lg text-slate-800 dark:text-slate-100">
                {currency.last90Days.nightLandings}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {' '}/ {currency.requiredLandings?.night ?? 3} landings
                </span>
              </p>
              {!currency.nightsCurrent && currency.requiredLandings?.night !== 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Need {(currency.requiredLandings?.night ?? 3) - currency.last90Days.nightLandings} more night landing{(currency.requiredLandings?.night ?? 3) - currency.last90Days.nightLandings !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
            {currency.last90Days.flights} flight{currency.last90Days.flights !== 1 ? 's' : ''} in the last 90 days &middot;
            {' '}{currency.last90Days.totalLandings} total landing{currency.last90Days.totalLandings !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Credential Expiry Alerts */}
      {credentials && credentials.length > 0 && (() => {
        const now = new Date();
        const expiring = credentials.filter((c) => {
          if (!c.expiryDate) return false;
          const days = Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return days <= 30;
        });
        if (expiring.length === 0) return null;
        return (
          <div className="mb-6 space-y-2">
            {expiring.map((cred) => {
              const days = Math.ceil((new Date(cred.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = days < 0;
              return (
                <div
                  key={cred.id}
                  className={`rounded-lg px-4 py-3 flex items-center justify-between text-sm cursor-pointer ${
                    isExpired
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  }`}
                  onClick={() => navigate('/credentials')}
                >
                  <span className={isExpired ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}>
                    {isExpired ? '⚠ ' : '⏰ '}
                    <strong>{cred.credentialType.replace(/_/g, ' ')}</strong>
                    {isExpired ? ` expired ${Math.abs(days)} days ago` : ` expires in ${days} days`}
                  </span>
                  <span className="text-xs opacity-60">View →</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Hours" value={statistics?.totalHours?.toFixed(1) ?? '0.0'} />
        <StatCard label="PIC Hours" value={statistics?.picHours?.toFixed(1) ?? '0.0'} />
        <StatCard label="Total Flights" value={String(statistics?.totalFlights ?? totalFlights)} />
        <StatCard
          label="Landings"
          value={String((statistics?.landingsDay ?? 0) + (statistics?.landingsNight ?? 0))}
          detail={`${statistics?.landingsDay ?? 0} day / ${statistics?.landingsNight ?? 0} night`}
        />
      </div>

      {/* Hours breakdown */}
      {statistics && statistics.totalHours > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Block Hours Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'PIC', value: statistics.picHours },
              { label: 'Dual', value: statistics.dualHours },
              ...(!isSPL ? [{ label: 'Night', value: statistics.nightHours }] : []),
              { label: 'IFR', value: statistics.ifrHours },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="data-lg text-slate-800 dark:text-slate-100">{value.toFixed(1)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Flights */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title">Recent Flights</h2>
          {totalFlights > 0 && (
            <button
              onClick={() => navigate('/flights')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              View all →
            </button>
          )}
        </div>
        {recentFlights.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentFlights.map((flight) => (
              <button
                key={flight.id}
                onClick={() => navigate(`/flights/${flight.id}`)}
                className="w-full flex justify-between items-center py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 text-left transition-colors"
              >
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
                  </span>
                  <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">{flight.aircraftReg}</span>
                </div>
                <div className="text-right">
                  <span className="data-sm text-slate-800 dark:text-slate-100">{flight.totalTime.toFixed(1)}h</span>
                  <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">{flight.date}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✈</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">No flights logged yet</p>
            <button
              onClick={() => navigate('/flights', { state: { openForm: true } })}
              className="btn-primary"
            >
              Log Your First Flight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="data-lg text-slate-800 dark:text-slate-100">{value}</p>
      {detail && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{detail}</p>}
    </div>
  );
}
