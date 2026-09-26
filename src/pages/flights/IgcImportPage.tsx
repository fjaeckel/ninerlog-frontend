import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { IgcImport } from '../../components/flights/igc/IgcImport';

/** `/flights/import-igc`; `?flight=<id>` attaches the files to that flight. */
export default function IgcImportPage() {
  const { t } = useTranslation('flights');
  const [params] = useSearchParams();
  const flightId = params.get('flight') || undefined;

  return (
    <PageWrapper maxWidth="content">
      <Link
        to={flightId ? `/flights/${flightId}` : '/flights'}
        className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {flightId ? t('igc.backToFlight') : t('detail.backToFlights')}
      </Link>
      <PageHeader
        title={flightId ? t('igc.attachTitle') : t('igc.pageTitle')}
        subtitle={flightId ? t('igc.attachSubtitle') : t('igc.pageSubtitle')}
      />
      <IgcImport key={flightId ?? 'new'} attachToFlightId={flightId} />
    </PageWrapper>
  );
}
