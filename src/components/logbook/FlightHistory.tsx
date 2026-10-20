import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { useFlightRevisions, useLogbookMode, type FlightRevision } from '../../hooks/useLogbook';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import {
  formatRevisionValue,
  isSystemRevision,
  revisionFieldLabelKey,
  type RevisionValueFormatters,
} from '../../lib/flightRevisions';
import { cn } from '../../lib/cn';

interface FlightHistoryListProps {
  revisions: FlightRevision[];
  /** When strict mode was last switched on. */
  since?: string | null;
}

/** A flight's revisions, newest first; system changes collapsed behind a toggle. */
export function FlightHistoryList({ revisions, since }: FlightHistoryListProps) {
  const { t } = useTranslation(['logbook', 'flights']);
  const { fmtDateTime } = useFormatPrefs();
  const [showSystem, setShowSystem] = useState(false);

  const systemCount = revisions.filter(isSystemRevision).length;
  const visible = showSystem ? revisions : revisions.filter((r) => !isSystemRevision(r));

  return (
    <div>
      {revisions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('logbook:history.empty')}</p>
      ) : (
        <ol className="space-y-3">
          {visible.map((revision) => (
            <RevisionItem key={revision.id} revision={revision} />
          ))}
        </ol>
      )}

      {systemCount > 0 && (
        <button
          type="button"
          className="btn-ghost btn-sm mt-2"
          aria-expanded={showSystem}
          onClick={() => setShowSystem((v) => !v)}
        >
          {showSystem ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          {showSystem
            ? t('logbook:history.hideSystem')
            : t('logbook:history.showSystem', { count: systemCount })}
        </button>
      )}

      {since && (
        <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t('logbook:history.since', { date: fmtDateTime(since) })}
        </p>
      )}
    </div>
  );
}

function RevisionItem({ revision }: { revision: FlightRevision }) {
  const { t } = useTranslation(['logbook', 'flights']);
  const { fmtDateTime, fmtDate, fmtDuration } = useFormatPrefs();
  const system = isSystemRevision(revision);
  const formatters: RevisionValueFormatters = {
    duration: fmtDuration,
    date: fmtDate,
    label: (key, options) => t(key, { ns: 'flights', ...options }),
    yes: t('logbook:history.yes'),
    no: t('logbook:history.no'),
    unset: t('logbook:history.unset'),
  };

  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-2.5',
        system
          ? 'border-dashed border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/30'
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <time dateTime={revision.changedAt} className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {fmtDateTime(revision.changedAt)}
        </time>
        {revision.kind === 'delete' ? (
          <span className="badge-expired">{t('logbook:history.deleted')}</span>
        ) : (
          <span className="badge-neutral">{t(`logbook:source.${revision.source}`)}</span>
        )}
        {revision.isCorrection && <span className="badge-expiring">{t('logbook:history.correction')}</span>}
      </div>

      {revision.reason && (
        <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200 break-words">
          {t('logbook:history.reason', { reason: revision.reason })}
        </p>
      )}

      {revision.kind === 'update' && revision.changes.length === 0 && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('logbook:history.noFieldChanges')}</p>
      )}

      {revision.changes.length > 0 && (
        <dl className="mt-2 space-y-1.5 text-sm">
          {revision.changes.map((change) => {
            const label = t(revisionFieldLabelKey(change.field), { ns: 'flights' });
            return (
              <div key={change.field}>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="flex flex-wrap items-baseline gap-x-1.5 break-words">
                  <del className="rounded bg-red-50 px-1 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {formatRevisionValue(change.field, change.oldValue, formatters)}
                  </del>
                  <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                    →
                  </span>
                  <ins className="rounded bg-green-50 px-1 text-green-800 no-underline dark:bg-green-900/30 dark:text-green-300">
                    {formatRevisionValue(change.field, change.newValue, formatters)}
                  </ins>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </li>
  );
}

/** History card for a flight; rendered in strict mode or when revisions exist. */
export function FlightHistoryCard({ flightId, className }: { flightId: string; className?: string }) {
  const { t } = useTranslation('logbook');
  const { data: mode } = useLogbookMode();
  const strict = mode?.strict === true;
  const { data: revisions, isError } = useFlightRevisions(flightId, { enabled: mode != null });

  if (!strict && !(revisions && revisions.length > 0)) return null;

  return (
    <section className={cn('card', className)} aria-labelledby="flight-history-title">
      <h2 id="flight-history-title" className="section-title mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {t('history.title')}
      </h2>
      {isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t('history.error')}</p>
      ) : (
        <FlightHistoryList revisions={revisions ?? []} since={mode?.since} />
      )}
    </section>
  );
}
