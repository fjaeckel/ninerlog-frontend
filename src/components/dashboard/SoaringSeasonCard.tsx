import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, MapPin, Mountain, Trophy } from 'lucide-react';
import { useSoaringSeason, type SoaringSeason } from '../../hooks/useSoaringSeason';
import { useDisciplines } from '../../hooks/usePilotProfile';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useRelevance } from '../../lib/relevance';
import { Skeleton } from '../ui/Skeleton';

type MethodKey = keyof SoaringSeason['launchesByMethod'];

/** Launch methods in display order. */
const METHODS: readonly MethodKey[] = ['winch', 'aerotow', 'selfLaunch', 'car', 'bungee', 'unspecified'];

const currentYear = () => new Date().getUTCFullYear();

/** Dashboard card: one calendar year of soaring flights. */
export function SoaringSeasonCard() {
  const { t } = useTranslation('dashboard');
  const thisYear = currentYear();
  const [year, setYear] = useState(thisYear);
  const disciplines = useDisciplines();
  const current = useSoaringSeason(thisYear);
  const shown = useSoaringSeason(year);
  const record = useMemo(() => ({ flights: current.data?.flights ?? 0 }), [current.data?.flights]);
  const relevance = useRelevance('dashboard.soaringSeason', { record });

  if (disciplines.isLoading || current.isLoading) {
    return (
      <section className="card mb-6" aria-busy="true" aria-label={t('soaring.title')} data-testid="soaring-season-skeleton">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-12 w-full mb-3" />
        <Skeleton className="h-4 w-3/4" />
      </section>
    );
  }
  if (!relevance.visible || current.isError) return null;

  const season = shown.data;
  return (
    <section className="card mb-6" aria-labelledby="soaring-season-title" data-testid="soaring-season">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 id="soaring-season-title" className="section-title flex items-center gap-2">
          <Mountain className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          {t('soaring.title')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label={t('soaring.previousYear')}
            className="inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="data-sm text-slate-800 dark:text-slate-100 tabular-nums w-12 text-center" aria-live="polite" data-testid="soaring-year">
            {year}
          </span>
          <button
            type="button"
            onClick={() => setYear((y) => Math.min(y + 1, thisYear))}
            disabled={year >= thisYear}
            aria-label={t('soaring.nextYear')}
            className="inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {!season && shown.isFetching ? (
        <Skeleton className="h-24 w-full" />
      ) : !season || season.flights === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="soaring-empty">
          {t('soaring.empty', { year })}
        </p>
      ) : (
        <SeasonBody season={season} />
      )}
    </section>
  );
}

function SeasonBody({ season }: { season: SoaringSeason }) {
  const { t } = useTranslation(['dashboard', 'flights']);
  const { fmtDuration, fmtDate } = useFormatPrefs();
  const methods = METHODS.filter((m) => season.launchesByMethod[m] > 0);
  const maxLaunches = Math.max(...methods.map((m) => season.launchesByMethod[m]), 1);
  const methodLabel = (m: MethodKey) =>
    m === 'unspecified' ? t('dashboard:soaring.unspecified') : t(`flights:launchMethods.${m}`);

  const tiles = [
    { key: 'flights', label: t('dashboard:soaring.flights'), value: String(season.flights) },
    { key: 'launches', label: t('dashboard:soaring.launches'), value: String(season.launches) },
    { key: 'hours', label: t('dashboard:soaring.hours'), value: fmtDuration(season.totalMinutes) },
    { key: 'average', label: t('dashboard:soaring.average'), value: fmtDuration(season.averageFlightMinutes) },
    { key: 'outlandings', label: t('dashboard:soaring.outlandings'), value: String(season.outlandings) },
  ];
  const longest = season.longestFlight;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
        {tiles.map((tile) => (
          <div key={tile.key} data-testid={`soaring-${tile.key}`}>
            <p className="data-lg text-slate-800 dark:text-slate-100">{tile.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tile.label}</p>
          </div>
        ))}
      </div>

      {methods.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('dashboard:soaring.byMethod')}</h3>
          <div className="space-y-2">
            {methods.map((m) => {
              const n = season.launchesByMethod[m];
              return (
                <div key={m} data-testid={`soaring-method-${m}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{methodLabel(m)}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">{n}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m === 'unspecified' ? 'bg-slate-400 dark:bg-slate-500' : 'bg-sky-500 dark:bg-sky-400'}`}
                      style={{ width: `${(n / maxLaunches) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(longest || season.sites.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {longest && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                {t('dashboard:soaring.longest')}
              </h3>
              <Link to={`/flights/${longest.flightId}`} className="link text-sm" data-testid="soaring-longest">
                {[fmtDuration(longest.minutes), longest.aircraftReg, fmtDate(longest.date)].filter(Boolean).join(' · ')}
              </Link>
            </div>
          )}
          {season.sites.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                {t('dashboard:soaring.sites')}
              </h3>
              <ul className="flex flex-wrap gap-2" data-testid="soaring-sites">
                {season.sites.map((s) => (
                  <li
                    key={s.place}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <span className="font-mono">{s.place}</span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">{s.flights}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
