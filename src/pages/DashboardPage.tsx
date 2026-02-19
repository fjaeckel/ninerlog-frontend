import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLicenses } from '../hooks/useLicenses';
import { useFlights } from '../hooks/useFlights';
import { useLicenseStatistics } from '../hooks/useStatistics';
import { useCredentials } from '../hooks/useCredentials';
import { useAllCurrencyStatus } from '../hooks/useCurrency';
import { useStatsByClass } from '../hooks/useStatsByClass';
import { CurrencyCard } from '../components/currency/CurrencyCard';
import { StatCard } from '../components/ui/StatCard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: licenses } = useLicenses();
  const navigate = useNavigate();

  // Use the first license for statistics (per-license endpoint still works)
  const firstLicense = licenses?.[0];

  const { data: flightsData } = useFlights({
    page: 1,
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const { data: statistics } = useLicenseStatistics(firstLicense?.id || '');
  const { data: currencyStatus } = useAllCurrencyStatus();
  const { data: credentials } = useCredentials();
  const { data: classStat } = useStatsByClass();

  const recentFlights = flightsData?.data || [];
  const totalFlights = flightsData?.pagination?.total || 0;

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

      {/* Currency Status — per class rating */}
      {currencyStatus && currencyStatus.ratings.length > 0 && (
        <div className="mb-6" data-testid="currency-section">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <span>🛡</span>
            Flight Currency
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {currencyStatus.ratings.map((rating) => (
              <CurrencyCard key={rating.classRatingId} rating={rating} />
            ))}
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
        <StatCard label="Total Hours" value={statistics?.totalHours?.toFixed(1) ?? '0.0'} unit="h" />
        <StatCard label="PIC Hours" value={statistics?.picHours?.toFixed(1) ?? '0.0'} unit="h" />
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
              { label: 'Solo', value: statistics.soloHours ?? 0 },
              { label: 'Cross-Country', value: statistics.crossCountryHours ?? 0 },
              { label: 'Night', value: statistics.nightHours },
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

      {/* Hours by Aircraft Class */}
      {classStat && classStat.byClass.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Hours by Aircraft Class</h2>
          <div className="space-y-2">
            {classStat.byClass.map((cs) => {
              const maxHours = Math.max(...classStat.byClass.map((c) => c.hours), 1);
              const pct = (cs.hours / maxHours) * 100;
              const classLabels: Record<string, string> = {
                SEP_LAND: 'SEP (Land)', SEP_SEA: 'SEP (Sea)',
                MEP_LAND: 'MEP (Land)', MEP_SEA: 'MEP (Sea)',
                SET_LAND: 'SET (Land)', SET_SEA: 'SET (Sea)',
                TMG: 'TMG', IR: 'IR', Unclassified: 'Unclassified',
              };
              return (
                <div key={cs.class} data-testid={`class-stat-${cs.class}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{classLabels[cs.class] || cs.class}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">{cs.hours.toFixed(1)}h · {cs.flights} flights · {cs.landings} ldg</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hours by Authority */}
      {classStat && classStat.byAuthority.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Hours by Authority</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {classStat.byAuthority.map((auth) => (
              <div key={`${auth.authority}-${auth.licenseType}`} className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="data-lg text-slate-800 dark:text-slate-100">{auth.hours.toFixed(1)}h</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{auth.authority} {auth.licenseType}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">{auth.flights} flights</p>
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
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium min-h-[44px] flex items-center"
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
