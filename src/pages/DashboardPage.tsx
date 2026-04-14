import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useLicenses } from '../hooks/useLicenses';
import { useFlights } from '../hooks/useFlights';
import { useLicenseStatistics } from '../hooks/useStatistics';
import { useCredentials } from '../hooks/useCredentials';
import { useAllCurrencyStatus } from '../hooks/useCurrency';
import { useStatsByClass } from '../hooks/useStatsByClass';
import { CurrencyCard } from '../components/currency/CurrencyCard';
import { StatCard } from '../components/ui/StatCard';
import { formatDuration, type TimeDisplayFormat } from '../lib/duration';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: licenses } = useLicenses();
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'common']);

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
  const greeting = hour < 12 ? t('dashboard:greeting.morning') : hour < 18 ? t('dashboard:greeting.afternoon') : t('dashboard:greeting.evening');

  return (
    <div className="mx-auto max-w-[1280px] py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">{greeting}, {user?.name || user?.email}!</h1>
        <button
          onClick={() => navigate('/flights', { state: { openForm: true } })}
          className="btn-primary hidden sm:inline-flex"
        >
          {t('dashboard:logFlight')}
        </button>
      </div>

      {/* Currency Status — per class rating */}
      {currencyStatus && currencyStatus.ratings.length > 0 && (
        <div className="mb-6" data-testid="currency-section">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <span>🛡</span>
            {t('dashboard:flightCurrency')}
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
                    {' '}{isExpired ? t('dashboard:credentialAlert.expired', { days: Math.abs(days) }) : t('dashboard:credentialAlert.expiresSoon', { days })}
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
        <StatCard label={t('dashboard:stats.totalTime')} value={statistics ? formatDuration(statistics.totalMinutes, (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm') : '0h 0m'} />
        <StatCard label={t('dashboard:stats.picTime')} value={statistics ? formatDuration(statistics.picMinutes, (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm') : '0h 0m'} />
        <StatCard label={t('dashboard:stats.totalFlights')} value={String(statistics?.totalFlights ?? totalFlights)} />
        <StatCard
          label={t('dashboard:stats.landings')}
          value={String((statistics?.landingsDay ?? 0) + (statistics?.landingsNight ?? 0))}
          detail={`${statistics?.landingsDay ?? 0} ${t('dashboard:stats.day')} / ${statistics?.landingsNight ?? 0} ${t('dashboard:stats.night')}`}
        />
      </div>

      {/* Hours breakdown */}
      {statistics && statistics.totalMinutes > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">{t('dashboard:blockTimeBreakdown')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: t('dashboard:breakdownLabels.pic'), value: statistics.picMinutes },
              { label: t('dashboard:breakdownLabels.dual'), value: statistics.dualMinutes },
              { label: t('dashboard:breakdownLabels.solo'), value: statistics.soloMinutes ?? 0 },
              { label: t('dashboard:breakdownLabels.crossCountry'), value: statistics.crossCountryMinutes ?? 0 },
              { label: t('dashboard:breakdownLabels.night'), value: statistics.nightMinutes },
              { label: t('dashboard:breakdownLabels.ifr'), value: statistics.ifrMinutes },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="data-lg text-slate-800 dark:text-slate-100">{formatDuration(value, (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time by Aircraft Class */}
      {classStat && classStat.byClass.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">{t('dashboard:timeByClass')}</h2>
          <div className="space-y-2">
            {classStat.byClass.map((cs) => {
              const maxMinutes = Math.max(...classStat.byClass.map((c) => c.minutes), 1);
              const pct = (cs.minutes / maxMinutes) * 100;
              const classLabel = t(`dashboard:classLabels.${cs.class}`, { defaultValue: cs.class });
              return (
                <div key={cs.class} data-testid={`class-stat-${cs.class}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{classLabel}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">{formatDuration(cs.minutes, (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm')} · {cs.flights} {t('common:flights')} · {cs.landings} {t('common:ldg')}</span>
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

      {/* Time by Authority */}
      {classStat && classStat.byAuthority.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">{t('dashboard:timeByAuthority')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {classStat.byAuthority.map((auth) => (
              <div key={`${auth.authority}-${auth.licenseType}`} className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="data-lg text-slate-800 dark:text-slate-100">{formatDuration(auth.minutes, (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{auth.authority} {auth.licenseType}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">{auth.flights} {t('common:flights')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Flights */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-title">{t('dashboard:recentFlights')}</h2>
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
                  <span className="data-sm text-slate-800 dark:text-slate-100">{formatDuration(flight.totalTime, (user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm')}</span>
                  <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">{flight.date}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✈</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{t('dashboard:noFlights')}</p>
            <button
              onClick={() => navigate('/flights', { state: { openForm: true } })}
              className="btn-primary"
            >
              {t('dashboard:logFirstFlight')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
