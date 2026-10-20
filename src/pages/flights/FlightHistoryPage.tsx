import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useFlightRevisions, useLogbookMode, useVoidedFlights } from '../../hooks/useLogbook';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { FlightHistoryList } from '../../components/logbook/FlightHistory';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';

/** Revision history of one flight, live or voided. */
export default function FlightHistoryPage() {
  const { flightId = '' } = useParams<{ flightId: string }>();
  const { t } = useTranslation('logbook');
  const { fmtDate, fmtDuration } = useFormatPrefs();
  const { data: mode } = useLogbookMode();
  const { data: revisions, isLoading, error } = useFlightRevisions(flightId);
  const deleted = revisions?.[0]?.kind === 'delete';
  const { data: voided } = useVoidedFlights({ enabled: deleted });
  const record = deleted ? voided?.find((v) => v.flightId === flightId) : undefined;

  const backTo = deleted ? '/flights/voided' : `/flights/${flightId}`;
  const backLabel = deleted ? t('historyPage.backToVoided') : t('historyPage.back');
  const subtitle = record
    ? `${fmtDate(record.date)} · ${record.aircraftReg} · ${record.departureIcao || '—'} → ${record.arrivalIcao || '—'} · ${fmtDuration(record.totalTime)}`
    : undefined;

  return (
    <PageWrapper maxWidth="content">
      <Link
        to={backTo}
        className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>
      <PageHeader title={deleted ? t('historyPage.voidedTitle') : t('historyPage.title')} subtitle={subtitle} />

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error || !revisions ? (
        <ErrorState title={t('historyPage.title')} message={t('historyPage.notFound')} />
      ) : (
        <div className="card">
          <FlightHistoryList revisions={revisions} since={mode?.since} />
        </div>
      )}
    </PageWrapper>
  );
}
