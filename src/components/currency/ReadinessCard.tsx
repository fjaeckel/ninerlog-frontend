import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Check, CircleAlert, CircleDashed, CircleHelp, RotateCw, X } from 'lucide-react';
import { useAllCurrencyStatus } from '../../hooks/useCurrency';
import { useCredentials } from '../../hooks/useCredentials';
import { useReadiness, type ReadinessItem } from '../../hooks/useReadiness';
import { useCurrencyMessages } from '../../lib/currencyMessages';
import { Skeleton } from '../ui/Skeleton';
import type { ClassRatingCurrency } from '../../types/api';

type Tone = 'ok' | 'warn' | 'no' | 'unknown' | 'off';

/** Days before medical expiry the card flags it. */
const MEDICAL_RENEWAL_WINDOW_DAYS = 45;

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-green-700 dark:text-green-400',
  warn: 'text-amber-700 dark:text-amber-400',
  no: 'text-red-700 dark:text-red-400',
  unknown: 'text-slate-500 dark:text-slate-400',
  off: 'text-slate-400 dark:text-slate-500',
};

function ToneIcon({ tone, className = 'w-5 h-5' }: { tone: Tone; className?: string }) {
  const cls = `${className} shrink-0 ${TONE_TEXT[tone]}`;
  if (tone === 'ok') return <Check className={cls} aria-hidden="true" />;
  if (tone === 'warn') return <CircleAlert className={cls} aria-hidden="true" />;
  if (tone === 'unknown') return <CircleHelp className={cls} aria-hidden="true" />;
  if (tone === 'off') return <CircleDashed className={cls} aria-hidden="true" />;
  return <X className={cls} aria-hidden="true" />;
}

/** One rating with the launch methods and passenger entry that belong to it. */
interface ClassGroup {
  rating: ReadinessItem;
  launches: ReadinessItem[];
  passengers?: ReadinessItem;
}

const itemTone = (item: ReadinessItem): Tone => {
  if (!item.ready) return item.status === 'unknown' ? 'unknown' : 'no';
  return item.status === 'expiring' ? 'warn' : 'ok';
};

const TONE_ORDER: Record<Tone, number> = { ok: 0, warn: 1, unknown: 2, no: 3, off: 4 };

/** Whether the item's passenger currency is counted in launches. */
const countsLaunches = (item: ReadinessItem) => item.classType === 'GLIDER' || item.ulKind === 'SAILPLANE';

/** Dashboard card answering "what may I fly today?"; hidden for a pilot with no rating. */
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
    <section className="card mb-6" aria-busy="true" aria-label={t('readiness.titleToday')} data-testid="readiness-skeleton">
      <Skeleton className="h-5 w-48 mb-4" />
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-10 w-full" />
    </section>
  );
}

function ReadinessPanel({ ratings }: { ratings: ClassRatingCurrency[] }) {
  const { t } = useTranslation(['currency', 'credentials', 'common']);
  const messages = useCurrencyMessages();
  const ids = useId();
  const { data: credentials } = useCredentials();

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: report, error, isLoading, refetch, isFetching } = useReadiness({ date: today, aircraftReg: null, passengers: true });

  const items = report?.items ?? [];
  const ratingItems = items.filter((i) => i.kind === 'rating');
  const credItems = items.filter((i) => i.kind === 'credential');

  const groups: ClassGroup[] = ratingItems
    .map((rating) => ({
      rating,
      launches: items.filter((i) => i.kind === 'launch_method' && i.classRatingId === rating.classRatingId),
      passengers: items.find((i) => i.kind === 'passengers' && i.classType === rating.classType && (i.ulKind ?? null) === (rating.ulKind ?? null)),
    }))
    .sort((a, b) => TONE_ORDER[itemTone(a.rating)] - TONE_ORDER[itemTone(b.rating)]);

  const classLabel = (item: ReadinessItem) => {
    const cls = item.classType ? t(`classTypes.${item.classType}`, { defaultValue: item.classType }) : '';
    const label = item.ulKind ? `${cls} · ${t(`common:ulKinds.${item.ulKind}`, { defaultValue: item.ulKind })}` : cls;
    const twin = ratingItems.some((o) => o !== item && o.classType === item.classType && o.ulKind === item.ulKind);
    const licence = twin ? ratings.find((r) => r.classRatingId === item.classRatingId)?.licenseType : undefined;
    return [label, licence].filter(Boolean).join(' · ');
  };

  /** Short shortfall, e.g. "2 more launches"; null when the item has no count. */
  const shortfall = (item: ReadinessItem): string | null => {
    const p = item.params;
    if (item.ready || !p) return null;
    if (item.reasonKey === 'remedy.launch_method_dual' && p.missing != null) {
      return t('readiness.launchesSupervised', { count: p.missing });
    }
    if (item.reasonKey === 'pax.not_current' && p.needed != null) {
      return t(countsLaunches(item) ? 'remedyAmount.launches' : 'remedyAmount.landings', { count: p.needed });
    }
    return null;
  };

  const medicalLabel = (item: ReadinessItem) => {
    const type = credentials?.find((c) => c.id === item.credentialId)?.credentialType;
    return credItems.length > 1 && type
      ? t(`credentials:types.${type}`, { defaultValue: t('readiness.medical') })
      : t('readiness.medical');
  };

  const medicalTone = (item: ReadinessItem): Tone => {
    if (!item.ready) return 'no';
    const expires = typeof item.params?.date === 'string' ? parseISO(item.params.date) : null;
    return expires && differenceInCalendarDays(expires, new Date()) <= MEDICAL_RENEWAL_WINDOW_DAYS ? 'warn' : 'ok';
  };

  const medicalExpired = credItems.some((i) => !i.ready);

  const flyable = groups.filter((g) => g.rating.ready);
  const notToday = groups.filter((g) => !g.rating.ready);

  const renderGroup = ({ rating, launches, passengers }: ClassGroup, canFly: boolean) => {
    const tone: Tone = canFly ? itemTone(rating) : 'off';
    let status: string | null = null;
    const details: string[] = [];
    if (!canFly) {
      details.push(messages.readinessReason(rating));
    } else {
      status = !passengers ? t('readiness.current') : passengers.ready ? t('readiness.withPassengers') : t('readiness.soloOnly');
      if (tone === 'warn') details.push(messages.readinessReason(rating));
      if (passengers && !passengers.ready) {
        const paxShort = shortfall(passengers);
        details.push(paxShort ? t('readiness.forPassengers', { what: paxShort }) : messages.readinessReason(passengers));
      }
    }
    return (
      <li
        key={rating.classRatingId ?? `${rating.classType}-${rating.ulKind ?? ''}`}
        className={`flex gap-3 ${canFly ? 'py-3 first:pt-0 last:pb-0' : ''}`}
        data-testid={`readiness-class-${rating.classType}${rating.ulKind ? `-${rating.ulKind}` : ''}`}
        data-tone={tone}
      >
        <ToneIcon tone={tone} className="w-5 h-5 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className={`font-medium ${canFly ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
              {classLabel(rating)}
            </span>
            {status && <span className={`text-sm ${TONE_TEXT[tone]}`}>{status}</span>}
          </div>
          {details.map((d) => (
            <p key={d} className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{d}</p>
          ))}
          {launches.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-300">
              {launches.map((l) => {
                const short = shortfall(l);
                const launchTone: Tone = l.ready ? (canFly ? 'ok' : 'off') : canFly ? 'warn' : 'off';
                return (
                  <li
                    key={l.launchMethod}
                    className="flex items-start gap-1"
                    title={messages.readinessReason(l)}
                    data-testid={`readiness-launch-${l.launchMethod}`}
                    data-ready={l.ready}
                  >
                    <ToneIcon tone={launchTone} className="w-3.5 h-3.5 mt-px" />
                    <span>
                      {messages.launchMethod(l.launchMethod ?? '')}
                      {short && <span className={canFly ? TONE_TEXT.warn : 'text-slate-500 dark:text-slate-400'}> · {short}</span>}
                    </span>
                    <span className="sr-only">{l.ready ? t('readiness.ready') : t('readiness.notReady')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </li>
    );
  };


  let body;
  if (error) {
    body = (
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300" data-testid="readiness-error">
        <span>{t('readiness.loadFailed')}</span>
        <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw className="w-4 h-4" aria-hidden="true" />
          {t('readiness.retry')}
        </button>
      </div>
    );
  } else if (isLoading || !report) {
    body = (
      <div className="space-y-2" aria-busy="true" data-testid="readiness-loading">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  } else {
    body = (
      <div data-testid="readiness-result">
        {medicalExpired && (
          <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-400" role="alert" data-testid="readiness-medical-blocks">
            {t('readiness.medicalBlocks')}
          </p>
        )}
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="readiness-empty">{t('readiness.noRatingItems')}</p>
        ) : flyable.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="readiness-nothing-current">{t('readiness.nothingCurrent')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">{flyable.map((g) => renderGroup(g, true))}</ul>
        )}
        {notToday.length > 0 && (
          <section className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700" data-testid="readiness-not-today">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{t('readiness.notToday')}</h3>
            <ul className="space-y-3">{notToday.map((g) => renderGroup(g, false))}</ul>
          </section>
        )}
        {credItems.length > 0 && (
          <ul className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
            {credItems.map((c) => {
              const tone = medicalTone(c);
              return (
                <li
                  key={c.credentialId}
                  className="flex items-center gap-2 text-sm"
                  data-testid="readiness-medical"
                  data-tone={tone}
                >
                  <ToneIcon tone={tone} className="w-4 h-4" />
                  <span className="text-slate-700 dark:text-slate-200">{medicalLabel(c)}</span>
                  <span className={tone === 'ok' ? 'text-slate-500 dark:text-slate-400' : TONE_TEXT[tone]}>
                    {messages.readinessReason(c)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('readiness.basis')}</p>
      </div>
    );
  }

  return (
    <section className="card mb-6" data-testid="readiness-card" aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className="section-title mb-3">{t('readiness.titleToday')}</h2>
      {body}
    </section>
  );
}
