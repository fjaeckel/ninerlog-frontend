import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FileUp } from 'lucide-react';
import { Relevant } from '../../relevance';
import type { Aircraft } from '../../../lib/relevance';
import { igcImportPath } from '../../../lib/igc';

interface IgcImportEntryProps {
  aircraft?: Aircraft | null;
  flightId?: string;
}

/** "Import IGC" link in the flight form, relevant for sailplanes and TMGs. */
export function IgcImportEntry({ aircraft, flightId }: IgcImportEntryProps) {
  const { t } = useTranslation('flights');
  return (
    <Relevant id="flight.igcImport" ctx={{ aircraft }}>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
        <Link to={igcImportPath(flightId)} className="link inline-flex min-h-11 items-center gap-1.5 font-medium">
          <FileUp className="h-4 w-4" aria-hidden="true" />
          {flightId ? t('files.attachIgc') : t('igc.entry')}
        </Link>
        <span>{t('igc.entryHint')}</span>
      </p>
    </Relevant>
  );
}

/** Card pointing to the IGC import from the logbook import page. */
export function IgcImportCard() {
  const { t } = useTranslation('flights');
  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid="igc-import-card">
      <div className="min-w-0">
        <h2 className="section-title">{t('igc.pageTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('igc.pageSubtitle')}</p>
      </div>
      <Link to={igcImportPath()} className="btn-secondary shrink-0">
        <FileUp className="h-4 w-4" aria-hidden="true" />
        {t('igc.entry')}
      </Link>
    </div>
  );
}
