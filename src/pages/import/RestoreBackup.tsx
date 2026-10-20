import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ChevronRight, DatabaseBackup, Info } from 'lucide-react';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { RestoreError, useRestoreJSON } from '../../hooks/useImport';
import { useIsStrictLogbook } from '../../hooks/useLogbook';
import type { ImportJSONResult, RestoreMode, RestoreWarning } from '../../hooks/useImport';
import { SummaryCard } from './SummaryCard';

const JSON_ACCEPT = 'application/json,.json';

const KNOWN_SECTIONS = [
  'flights',
  'aircraft',
  'licenses',
  'classRatings',
  'credentials',
  'contacts',
  'customCurrencyRules',
  'customReports',
  'notificationPreferences',
  'flightBaseline',
] as const;

type Step = 'idle' | 'confirmReplace' | 'replaceBlocked' | 'done';

/** The "Restore JSON Backup" tab of the import page. */
export default function RestoreBackup() {
  const { t } = useTranslation(['import', 'common']);
  const restore = useRestoreJSON();
  const strictLogbook = useIsStrictLogbook();
  const [step, setStep] = useState<Step>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportJSONResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messageFor = (err: unknown): string => {
    if (!(err instanceof RestoreError)) return t('restoreFailed');
    switch (err.kind) {
      case 'invalid_json':
        return t('restoreErrors.invalidJson');
      case 'not_a_backup':
        return t('restoreErrors.notABackup');
      case 'too_large':
        return t('restoreErrors.tooLarge');
      case 'backup_version_unsupported':
        return t('restoreErrors.versionUnsupported');
      default:
        return err.message || t('restoreFailed');
    }
  };

  const run = async (selected: File, mode: RestoreMode) => {
    setError(null);
    try {
      const data = await restore.mutateAsync({ file: selected, mode });
      setResult(data);
      setStep('done');
    } catch (err: unknown) {
      if (err instanceof RestoreError && err.kind === 'account_not_empty') {
        setStep('confirmReplace');
      } else if (err instanceof RestoreError && err.kind === 'replace_would_drop_attachments') {
        setStep('replaceBlocked');
      } else {
        setStep('idle');
        setError(messageFor(err));
      }
    }
  };

  const handleFileSelected = (selected: File) => {
    setFile(selected);
    setResult(null);
    void run(selected, 'restore');
  };

  const handleReset = () => {
    setStep('idle');
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4"
        >
          {error}
        </div>
      )}

      {step === 'idle' && (
        <FileDropzone
          accept={JSON_ACCEPT}
          disabled={restore.isPending}
          onFileSelected={handleFileSelected}
          onFileRejected={(rejected) =>
            setError(t('unsupportedFileType', 'Unsupported file: {{name}}. Expected {{accept}}.', {
              name: rejected.name,
              accept: JSON_ACCEPT,
            }))
          }
          buttonLabel={restore.isPending ? t('restoringJson') : t('selectJsonFile')}
          hint={t('dropHintJson')}
          className="card text-center py-12"
        >
          <DatabaseBackup className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('restoreJsonTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-2 max-w-md mx-auto">{t('restoreJsonDescription')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{t('restoreJsonNote')}</p>
        </FileDropzone>
      )}

      {step === 'confirmReplace' && file && (
        <section
          aria-labelledby="restore-replace-title"
          className="card border-red-200 dark:border-red-800 max-w-2xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="restore-replace-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {t('restoreReplace.title')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t('restoreReplace.body')}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t('restoreReplace.deletes')}</p>
              {strictLogbook && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t('restoreReplace.strict')}</p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t('restoreReplace.atomic')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 break-all">
                {t('restoreReplace.file', { name: file.name })}
              </p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4 space-y-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('restoreReplace.confirm')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void run(file, 'replace')}
                disabled={restore.isPending}
                className="btn-danger"
              >
                {restore.isPending ? t('restoringJson') : t('restoreReplace.replaceButton')}
              </button>
              <button type="button" onClick={handleReset} disabled={restore.isPending} className="btn-secondary">
                {t('common:cancel')}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'replaceBlocked' && (
        <section
          aria-labelledby="restore-blocked-title"
          className="card border-amber-200 dark:border-amber-800 max-w-2xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="restore-blocked-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {t('restoreBlocked.title')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t('restoreBlocked.body')}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t('restoreBlocked.options')}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t('restoreBlocked.nothingChanged')}</p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="button" onClick={handleReset} className="btn-secondary">
              {t('restoreBlocked.back')}
            </button>
          </div>
        </section>
      )}

      {step === 'done' && result && (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 dark:text-green-400" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('restoreJsonSuccess')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {result.mode === 'replace' ? t('restoreJsonSummaryReplaced') : t('restoreJsonSummary')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
            <SummaryCard label={t('restoreSummaryAircraftImported')} value={result.aircraftImported} color="green" />
            <SummaryCard label={t('restoreSummaryAircraftSkipped')} value={result.aircraftSkipped} color="amber" />
            <SummaryCard label={t('restoreSummaryLicenses')} value={result.licensesImported} color="green" />
            <SummaryCard label={t('restoreSummaryClassRatings')} value={result.classRatingsImported} color="green" />
            <SummaryCard label={t('restoreSummaryCredentials')} value={result.credentialsImported} color="green" />
            <SummaryCard label={t('restoreSummaryFlights')} value={result.flightsImported} color="green" />
            <SummaryCard label={t('restoreSummaryCrew')} value={result.crewMembersImported} color="green" />
            <SummaryCard label={t('restoreSummaryCustomReports')} value={result.customReportsImported} color="green" />
            <SummaryCard label={t('restoreSummaryFlightRevisions')} value={result.flightRevisionsImported} color="green" />
            <SummaryCard
              label={t('restoreSummaryLogbookCertifications')}
              value={result.logbookCertificationsImported}
              color="green"
            />
          </div>

          {result.warnings.length > 0 && <RestoreWarnings warnings={result.warnings} />}

          <button type="button" onClick={handleReset} className="btn-primary">
            {t('restoreAnother')}
          </button>
        </div>
      )}
    </>
  );
}

function RestoreWarnings({ warnings }: { warnings: RestoreWarning[] }) {
  const { t } = useTranslation('import');
  const sectionLabel = (section: string) =>
    (KNOWN_SECTIONS as readonly string[]).includes(section) ? t(`restoreSections.${section}`) : section;

  return (
    <details className="group text-left max-w-2xl mx-auto mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <summary className="flex items-center gap-2 cursor-pointer list-none px-4 py-3 min-h-[44px] text-sm font-medium text-amber-800 dark:text-amber-300">
        <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{t('restoreWarnings.summary', { count: warnings.length })}</span>
      </summary>
      <div className="px-4 pb-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{t('restoreWarnings.intro')}</p>
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li
              key={`${w.section}-${w.index}`}
              className="text-sm rounded-md bg-white dark:bg-slate-800 border border-amber-100 dark:border-slate-700 px-3 py-2"
            >
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {t('restoreWarnings.row', { section: sectionLabel(w.section), position: w.index + 1 })}
              </span>
              <span className="block text-slate-600 dark:text-slate-300">{w.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
