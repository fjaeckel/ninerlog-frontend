import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Archive, ArrowLeft, History } from 'lucide-react';
import { useVoidedFlights, type VoidedFlight } from '../../hooks/useLogbook';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';

const routeOf = (v: VoidedFlight) => `${v.departureIcao || '—'} → ${v.arrivalIcao || '—'}`;
const historyPath = (v: VoidedFlight) => `/flights/${v.flightId}/history`;

export default function VoidedFlightsPage() {
  const { t } = useTranslation(['logbook', 'flights']);
  const { fmtDate, fmtDateTime, fmtDuration } = useFormatPrefs();
  const { data: voided, isLoading, error } = useVoidedFlights();

  const historyLabel = (v: VoidedFlight) =>
    t('logbook:voided.viewHistoryAria', { date: fmtDate(v.date), reg: v.aircraftReg });

  return (
    <PageWrapper maxWidth="list">
      <Link
        to="/flights"
        className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('flights:detail.backToFlights')}
      </Link>
      <PageHeader title={t('logbook:voided.title')} subtitle={t('logbook:voided.description')} />

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState title={t('logbook:voided.title')} message={t('logbook:voided.error')} />
      ) : !voided || voided.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={t('logbook:voided.empty')}
          description={t('logbook:voided.emptyDescription')}
        />
      ) : (
        <>
          {/* Phones: one card per void record */}
          <ul className="space-y-3 md:hidden">
            {voided.map((v) => (
              <li key={v.revisionId} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(v.date)}</p>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-100">{routeOf(v)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-mono">{v.aircraftReg}</span> · {v.aircraftType}
                    </p>
                  </div>
                  <p className="font-mono text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {fmtDuration(v.totalTime)}
                  </p>
                </div>
                {v.reason && (
                  <p className="mt-2 break-words text-sm text-slate-700 dark:text-slate-200">
                    {t('logbook:history.reason', { reason: v.reason })}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {t('logbook:voided.deletedAt')} {fmtDateTime(v.deletedAt)}
                    </span>
                    {v.isCorrection && <span className="badge-expiring">{t('logbook:history.correction')}</span>}
                  </div>
                  <Link to={historyPath(v)} className="btn-secondary btn-sm" aria-label={historyLabel(v)}>
                    <History className="h-4 w-4" aria-hidden="true" />
                    {t('logbook:voided.viewHistory')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {/* md+: table */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700" aria-label={t('logbook:voided.title')}>
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {(['deletedAt', 'date', 'aircraft', 'route', 'total', 'reason'] as const).map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={`px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400 ${col === 'total' ? 'text-right' : 'text-left'}`}
                    >
                      {t(`logbook:voided.${col}`)}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2.5">
                    <span className="sr-only">{t('logbook:voided.viewHistory')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {voided.map((v) => (
                  <tr key={v.revisionId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {fmtDateTime(v.deletedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">{fmtDate(v.date)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{v.aircraftReg}</span>{' '}
                      <span className="text-slate-500 dark:text-slate-400">{v.aircraftType}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{routeOf(v)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {fmtDuration(v.totalTime)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      <span className="break-words">{v.reason || '—'}</span>
                      {v.isCorrection && <span className="badge-expiring ml-2">{t('logbook:history.correction')}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Link to={historyPath(v)} className="btn-ghost btn-sm" aria-label={historyLabel(v)}>
                        <History className="h-4 w-4" aria-hidden="true" />
                        {t('logbook:voided.viewHistory')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
