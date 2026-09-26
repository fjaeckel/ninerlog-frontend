import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO } from 'date-fns';
import { Check, CircleHelp, PlaneTakeoff, RotateCw, X } from 'lucide-react';
import { useAllCurrencyStatus } from '../../hooks/useCurrency';
import { useAircraft, useAircraftStats } from '../../hooks/useAircraft';
import { useCredentials } from '../../hooks/useCredentials';
import { ReadinessError, useReadiness, type ReadinessItem } from '../../hooks/useReadiness';
import { defaultReadinessAircraft, nextSaturday, readinessDateBounds } from '../../lib/readiness';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useCurrencyMessages } from '../../lib/currencyMessages';
import { Skeleton } from '../ui/Skeleton';
import type { ClassRatingCurrency } from '../../types/api';

function ItemIcon({ item }: { item: ReadinessItem }) {
  if (item.ready) {
    const tone = item.status === 'expiring' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';
    return <Check className={`w-4 h-4 shrink-0 ${tone}`} aria-hidden="true" />;
  }
  if (item.status === 'unknown') {
    return <CircleHelp className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />;
  }
  return <X className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />;
}

/** Dashboard card answering "may I fly on this date?"; hidden for a pilot with no rating. */
export function ReadinessCard() {
  const { data: currency, isLoading: currencyLoading } = useAllCurrencyStatus();
  const ratings = currency?.ratings ?? [];

  if (currencyLoading) return <ReadinessSkeleton />;
  if (currency && ratings.length === 0) return null;
  return <ReadinessPanel ratings={ratings} />;
}

function ReadinessSkeleton() {
  const { t } = useTranslation('currency');
  return (
    <section className="card mb-6" aria-busy="true" aria-label={t('readiness.title')} data-testid="readiness-skeleton">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-11 w-full mb-3" />
      <Skeleton className="h-4 w-3/4" />
    </section>
  );
}

function ReadinessPanel({ ratings }: { ratings: ClassRatingCurrency[] }) {
  const { t, i18n } = useTranslation(['currency', 'credentials', 'common']);
  const { fmtDate } = useFormatPrefs();
  const messages = useCurrencyMessages();
  const ids = useId();
  const { data: fleet, isLoading: fleetLoading } = useAircraft();
  const { data: stats, isLoading: statsLoading } = useAircraftStats();
  const { data: credentials } = useCredentials();

  const bounds = readinessDateBounds();
  const [date, setDate] = useState(() => nextSaturday());
  const [chosenReg, setChosenReg] = useState<string | null | undefined>(undefined);
  const [passengers, setPassengers] = useState(true);

  const fleetReady = !fleetLoading && !statsLoading;
  const activeFleet = (fleet ?? []).filter((a) => a.isActive !== false);
  const aircraftReg = chosenReg !== undefined
    ? chosenReg
    : fleetReady ? defaultReadinessAircraft(fleet ?? [], stats, ratings) : undefined;
  const dateInRange = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= bounds.min && date <= bounds.max;

  const { data: report, error, isLoading, refetch, isFetching } = useReadiness(
    { date, aircraftReg: aircraftReg ?? null, passengers },
    { enabled: dateInRange && aircraftReg !== undefined },
  );

  const dayLabel = dateInRange
    ? `${parseISO(date).toLocaleDateString(i18n.language, { weekday: 'long' })}, ${fmtDate(date)}`
    : date;

  const items = report?.items ?? [];
  const ratingItems = items.filter((i) => i.kind === 'rating');
  const paxItems = items.filter((i) => i.kind === 'passengers');
  const credItems = items.filter((i) => i.kind === 'credential');

  const classLabel = (item: ReadinessItem) => {
    const cls = item.classType ? t(`classTypes.${item.classType}`, { defaultValue: item.classType }) : '';
    return item.ulKind ? `${cls} · ${t(`common:ulKinds.${item.ulKind}`, { defaultValue: item.ulKind })}` : cls;
  };

  const labelFor = (item: ReadinessItem): string => {
    switch (item.kind) {
      case 'rating': {
        if (ratingItems.length <= 1) return t('readiness.solo');
        const twin = ratingItems.some((o) => o !== item && o.classType === item.classType && o.ulKind === item.ulKind);
        const licence = twin ? ratings.find((r) => r.classRatingId === item.classRatingId)?.licenseType : undefined;
        return [t('readiness.solo'), classLabel(item), licence].filter(Boolean).join(' · ');
      }
      case 'launch_method':
        return messages.launchMethod(item.launchMethod ?? '');
      case 'passengers':
        return paxItems.length > 1 ? `${t('readiness.passengers')} · ${classLabel(item)}` : t('readiness.passengers');
      case 'credential': {
        const type = credentials?.find((c) => c.id === item.credentialId)?.credentialType;
        return credItems.length > 1 && type
          ? t(`credentials:types.${type}`, { defaultValue: t('readiness.medical') })
          : t('readiness.medical');
      }
      default:
        return item.kind;
    }
  };

  /** Short shortfall shown next to a not-ready item, e.g. "2 more launches". */
  const shortfall = (item: ReadinessItem): string | null => {
    if (item.ready || !item.params) return null;
    if (item.reasonKey === 'remedy.launch_method_dual' && item.params.missing != null) {
      return t('remedyAmount.launches', { count: item.params.missing });
    }
    if (item.reasonKey === 'pax.not_current' && item.params.needed != null) {
      return t('remedyAmount.landings', { count: item.params.needed });
    }
    return null;
  };

  const notReady = items.filter((i) => !i.ready);
  const status = error instanceof ReadinessError ? error.status : error ? 0 : null;

  return (
    <section className="card mb-6" data-testid="readiness-card" aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className="section-title flex items-center gap-2 mb-3">
        <PlaneTakeoff className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {t('readiness.title')}
      </h2>

      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,18rem)_auto] sm:justify-start sm:items-end mb-4">
        <div>
          <label htmlFor={`${ids}-date`} className="form-label">{t('readiness.date')}</label>
          <input
            id={`${ids}-date`}
            type="date"
            className={`input tabular-nums ${dateInRange ? '' : 'input-error'}`}
            value={date}
            min={bounds.min}
            max={bounds.max}
            onChange={(e) => setDate(e.target.value)}
            data-testid="readiness-date"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${ids}-aircraft`} className="form-label">{t('readiness.aircraft')}</label>
          <select
            id={`${ids}-aircraft`}
            className="input"
            value={aircraftReg ?? ''}
            onChange={(e) => setChosenReg(e.target.value || null)}
            disabled={!fleetReady}
            data-testid="readiness-aircraft"
          >
            <option value="">{t('readiness.allRatings')}</option>
            {activeFleet.map((a) => (
              <option key={a.id} value={a.registration}>
                {a.registration} · {a.model || a.type}
              </option>
            ))}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 h-11 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox"
            checked={passengers}
            onChange={(e) => setPassengers(e.target.checked)}
            data-testid="readiness-passengers"
          />
          {t('readiness.withPassengers')}
        </label>
      </div>

      {!dateInRange ? (
        <p className="form-error" role="alert" data-testid="readiness-date-error">
          {t('readiness.dateOutOfRange', { max: fmtDate(bounds.max) })}
        </p>
      ) : status === 404 ? (
        <p className="text-sm text-amber-800 dark:text-amber-300" role="alert" data-testid="readiness-unknown-aircraft">
          {t('readiness.unknownAircraft')}
        </p>
      ) : status === 400 ? (
        <p className="form-error" role="alert" data-testid="readiness-date-error">
          {t('readiness.dateOutOfRange', { max: fmtDate(bounds.max) })}
        </p>
      ) : status !== null ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300" data-testid="readiness-error">
          <span>{t('readiness.loadFailed')}</span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
            <RotateCw className="w-4 h-4" aria-hidden="true" />
            {t('readiness.retry')}
          </button>
        </div>
      ) : isLoading || !report ? (
        <div className="space-y-2" aria-busy="true" data-testid="readiness-loading">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="readiness-empty">{t('readiness.noItems')}</p>
      ) : (
        <div data-testid="readiness-result">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">
            {t(notReady.length === 0 ? 'readiness.allReady' : 'readiness.someNotReady', { day: dayLabel })}
          </p>
          <ul className="flex flex-wrap gap-2" aria-label={dayLabel}>
            {items.map((item, idx) => {
              const extra = shortfall(item);
              const label = labelFor(item);
              return (
                <li
                  key={`${item.kind}-${item.classRatingId ?? item.credentialId ?? ''}-${item.launchMethod ?? item.classType ?? idx}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                    item.ready
                      ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200'
                      : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200'
                  }`}
                  title={messages.readinessReason(item)}
                  data-testid={`readiness-item-${item.kind}${item.launchMethod ? `-${item.launchMethod}` : ''}`}
                  data-ready={item.ready}
                >
                  <ItemIcon item={item} />
                  <span>{label}</span>
                  <span className="sr-only">{item.ready ? t('readiness.ready') : t('readiness.notReady')}</span>
                  {extra && <span className="text-xs opacity-80">({extra})</span>}
                </li>
              );
            })}
          </ul>
          {notReady.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm" data-testid="readiness-reasons">
              {notReady.map((item, idx) => (
                <li key={`${item.kind}-${idx}`} className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{labelFor(item)}:</span>{' '}
                  {messages.readinessReason(item)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('readiness.basis')}</p>
        </div>
      )}
    </section>
  );
}
