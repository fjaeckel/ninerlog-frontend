import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Clock, Plane, Plus, ArrowDownToLine, BadgeCheck, ShieldCheck, TimerReset } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFlights } from '../hooks/useFlights';
import { useMyStatistics } from '../hooks/useStatistics';
import { useCredentials } from '../hooks/useCredentials';
import { useAllCurrencyStatus } from '../hooks/useCurrency';
import { useStatsByClass } from '../hooks/useStatsByClass';
import { useTrends, fillTrendMonths } from '../hooks/useTrends';
import { useAircraftStats } from '../hooks/useAircraft';
import { CurrencyCard } from '../components/currency/CurrencyCard';
import { StatCard } from '../components/ui/StatCard';
import { PageWrapper } from '../components/ui/PageWrapper';
import { useFormatPrefs } from '../hooks/useFormatPrefs';
import { useRecencyPrefs } from '../hooks/useRecencyPrefs';
import { recencyLevel, RECENCY_DOT_CLASSES } from '../lib/recency';

/** Renders an API `YYYY-MM` key as a locale-aware short month name. */
function shortMonth(month: string, locale: string) {
  const [y, m] = month.split('-');
  if (!y || !m) return month;
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString(locale, { month: 'short' });
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'common', 'credentials']);
  const { fmtDuration, fmtDate } = useFormatPrefs();

  const { data: flightsData } = useFlights({
    page: 1,
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const { data: statistics } = useMyStatistics();
  const { data: currencyStatus } = useAllCurrencyStatus();
  const { data: credentials } = useCredentials();
  const { data: classStat } = useStatsByClass();
  const { data: trends } = useTrends(12);
  const { data: aircraftStats } = useAircraftStats();
  const recencyPrefs = useRecencyPrefs();

  const trendMonths = fillTrendMonths(trends?.trends, 12);
  const hasTrendActivity = trendMonths.some((m) => (m.totalMinutes ?? 0) > 0);
  const maxTrendMinutes = Math.max(...trendMonths.map((m) => m.totalMinutes ?? 0), 1);

  const modelStats = [...(aircraftStats?.byType.values() ?? [])]
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 6);

  const recentFlights = flightsData?.data || [];
  const totalFlights = flightsData?.pagination?.total || 0;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard:greeting.morning') : hour < 18 ? t('dashboard:greeting.afternoon') : t('dashboard:greeting.evening');

  return (
    <PageWrapper maxWidth="list">
      {/* Hero greeting */}
      <div className="hero-greeting mb-6">
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-blue-100/80">
              {greeting}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              {user?.name || user?.email}
            </h1>
          </div>
          <button
            onClick={() => navigate('/flights', { state: { openForm: true } })}
            className="hidden sm:inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-white text-blue-700 font-semibold shadow-sm hover:bg-blue-50 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('dashboard:logFlight')}
          </button>
        </div>
      </div>

      {/* Currency Status — per class rating */}
      {currencyStatus && currencyStatus.ratings.length > 0 && (
        <div className="mb-6" data-testid="currency-section">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
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
                <button
                  key={cred.id}
                  type="button"
                  className={`w-full text-left rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-sm transition-colors ${
                    isExpired
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                  }`}
                  onClick={() => navigate('/credentials')}
                >
                  <span
                    className={`inline-flex items-start gap-2 min-w-0 text-left ${
                      isExpired ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {isExpired ? (
                      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <TimerReset className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0">
                      <strong>{t(`credentials:types.${cred.credentialType}`, { defaultValue: cred.credentialType.replace(/_/g, ' ') })}</strong>
                      {' '}{isExpired ? t('dashboard:credentialAlert.expired', { days: Math.abs(days) }) : t('dashboard:credentialAlert.expiresSoon', { days })}
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs opacity-70">
                    {t('common:view')}
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Initial-hours snapshot indicator */}
      {statistics?.baseline && (
        <div className="mb-4 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-200">
          {t('dashboard:baselineApplied', {
            hours: ((statistics.baseline.totalMinutes ?? 0) / 60).toFixed(1),
            date: statistics.baseline.baselineDate,
            defaultValue:
              'Includes {{hours}}h carried forward from your initial-hours snapshot (as of {{date}}).',
          })}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label={t('dashboard:stats.totalTime')}
          value={statistics ? fmtDuration(statistics.totalMinutes) : '0h 0m'}
          icon={<Clock className="w-4 h-4" />}
          accent="blue"
        />
        <StatCard
          label={t('dashboard:stats.picTime')}
          value={statistics ? fmtDuration(statistics.picMinutes) : '0h 0m'}
          icon={<BadgeCheck className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label={t('dashboard:stats.totalFlights')}
          value={String(statistics?.totalFlights ?? totalFlights)}
          icon={<Plane className="w-4 h-4" />}
          accent="blue"
        />
        <StatCard
          label={t('dashboard:stats.landings')}
          value={String((statistics?.landingsDay ?? 0) + (statistics?.landingsNight ?? 0))}
          detail={`${statistics?.landingsDay ?? 0} ${t('dashboard:stats.day')} / ${statistics?.landingsNight ?? 0} ${t('dashboard:stats.night')}`}
          icon={<ArrowDownToLine className="w-4 h-4" />}
          accent="amber"
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
                <p className="data-lg text-slate-800 dark:text-slate-100">{fmtDuration(value)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly activity trend */}
      {hasTrendActivity && (
        <div className="card mb-6" data-testid="monthly-activity-section">
          <h2 className="section-title mb-4">{t('dashboard:monthlyActivity')}</h2>
          <div className="flex items-end gap-1.5 h-28" role="img" aria-label={t('dashboard:monthlyActivityLabel')}>
            {trendMonths.map((m) => {
              const minutes = m.totalMinutes ?? 0;
              const pct = (minutes / maxTrendMinutes) * 100;
              const label = shortMonth(m.month ?? '', i18n.language);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 h-full">
                  <div
                    className={`w-full rounded-t ${minutes > 0 ? 'bg-blue-500 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                    style={{ height: minutes > 0 ? `${Math.max(pct, 4)}%` : '2px' }}
                    title={`${label}: ${fmtDuration(minutes)} · ${m.flights ?? 0} ${t('common:flights')}`}
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{label}</span>
                </div>
              );
            })}
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
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">{fmtDuration(cs.minutes)} · {cs.flights} {t('common:flights')} · {cs.landings} {t('common:ldg')}</span>
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

      {/* Time by Aircraft Model */}
      {modelStats.length > 0 && (
        <div className="card mb-6" data-testid="model-stats-section">
          <h2 className="section-title mb-4">{t('dashboard:timeByModel')}</h2>
          <div className="space-y-2">
            {modelStats.map((ms) => {
              const maxMinutes = Math.max(...modelStats.map((m) => m.totalMinutes), 1);
              const pct = (ms.totalMinutes / maxMinutes) * 100;
              return (
                <div key={ms.aircraftType} data-testid={`model-stat-${ms.aircraftType}`}>
                  <div className="flex justify-between items-center text-sm mb-1 gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-0">
                      {recencyPrefs.perModel && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${RECENCY_DOT_CLASSES[recencyLevel(ms.landingsLast90Days)]}`}
                          title={t('dashboard:modelRecencyTitle', { count: ms.landingsLast90Days })}
                        />
                      )}
                      <span className="truncate">{ms.aircraftType}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                      {fmtDuration(ms.totalMinutes)} · {ms.totalFlights} {t('common:flights')}
                      {ms.lastFlightDate && (
                        <span className="hidden sm:inline"> · {fmtDate(ms.lastFlightDate)}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
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
              className="btn-ghost btn-sm min-h-[44px]"
            >
              {t('common:viewAll')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {recentFlights.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentFlights.map((flight) => (
              <button
                key={flight.id}
                onClick={() => navigate(`/flights/${flight.id}`)}
                className="w-full grid grid-cols-[1fr_auto] gap-2 items-center py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 text-left transition-colors"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-medium font-mono text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {flight.departureIcao || '—'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span className="font-medium font-mono text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {flight.arrivalIcao || '—'}
                  </span>
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 truncate">{flight.aircraftReg}</span>
                  {flight.signatureId && (
                    <ShieldCheck
                      className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0"
                      aria-label={t('signatures:section.signedBadge')}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="data-sm text-slate-800 dark:text-slate-100">{fmtDuration(flight.totalTime)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{fmtDate(flight.date)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Plane
              className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600"
              strokeWidth={1.5}
              aria-hidden="true"
            />
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
    </PageWrapper>
  );
}
