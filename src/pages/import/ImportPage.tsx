import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUploadImport, usePreviewImport, useConfirmImport, useRestoreJSON, useImportHistory } from '../../hooks/useImport';
import type { ImportUploadResponse, ImportPreviewResponse, ImportResult, ImportColumnMapping, ImportJSONResult, ImportField } from '../../hooks/useImport';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  FolderOpen,
  XCircle,
} from 'lucide-react';
import HelpLink from '../../components/ui/HelpLink';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import SupportedLogbooks from './SupportedLogbooks';

const CSV_ACCEPT = '.csv,.txt';
const JSON_ACCEPT = 'application/json,.json';

const IMPORT_FIELDS = [
  { value: 'ignore', labelKey: 'fields.ignore' },
  { value: 'date', labelKey: 'fields.date' },
  { value: 'aircraftReg', labelKey: 'fields.aircraftReg' },
  { value: 'aircraftType', labelKey: 'fields.aircraftType' },
  { value: 'departureIcao', labelKey: 'fields.departureIcao' },
  { value: 'arrivalIcao', labelKey: 'fields.arrivalIcao' },
  { value: 'offBlockTime', labelKey: 'fields.offBlockTime' },
  { value: 'onBlockTime', labelKey: 'fields.onBlockTime' },
  { value: 'departureTime', labelKey: 'fields.departureTime' },
  { value: 'arrivalTime', labelKey: 'fields.arrivalTime' },
  { value: 'totalTime', labelKey: 'fields.totalTime' },
  { value: 'isPic', labelKey: 'fields.isPic' },
  { value: 'isDual', labelKey: 'fields.isDual' },
  { value: 'nightTime', labelKey: 'fields.nightTime' },
  { value: 'ifrTime', labelKey: 'fields.ifrTime' },
  { value: 'actualInstrumentTime', labelKey: 'fields.actualInstrumentTime' },
  { value: 'simulatedInstrumentTime', labelKey: 'fields.simulatedInstrumentTime' },
  { value: 'landingsDay', labelKey: 'fields.landingsDay' },
  { value: 'landingsNight', labelKey: 'fields.landingsNight' },
  { value: 'landingsTotal', labelKey: 'fields.landingsTotal' },
  { value: 'holds', labelKey: 'fields.holds' },
  { value: 'approachesCount', labelKey: 'fields.approachesCount' },
  { value: 'isIpc', labelKey: 'fields.isIpc' },
  { value: 'isFlightReview', labelKey: 'fields.isFlightReview' },
  { value: 'route', labelKey: 'fields.route' },
  { value: 'remarks', labelKey: 'fields.remarks' },
  { value: 'instructorName', labelKey: 'fields.instructorName' },
  { value: 'instructorComments', labelKey: 'fields.instructorComments' },
  { value: 'dualGivenTime', labelKey: 'fields.dualGivenTime' },
  { value: 'person1', labelKey: 'fields.person1' },
  { value: 'person2', labelKey: 'fields.person2' },
  { value: 'person3', labelKey: 'fields.person3' },
  { value: 'person4', labelKey: 'fields.person4' },
  { value: 'person5', labelKey: 'fields.person5' },
  { value: 'person6', labelKey: 'fields.person6' },
] as const satisfies readonly { value: ImportField; labelKey: string }[];

// Compile-time guard: every ImportField the API can suggest must have an option
// here, or the mapping <select> renders a value it has no <option> for — the row
// then displays the wrong field and silently changes it the moment the pilot
// touches that dropdown. `landingsTotal` shipped missing exactly that way.
//
// This list and the API enum are two sources of truth for one thing, which is
// the same shape of drift that made every hand-written import template wrong.
// The type error is the cheapest place to catch it: adding a field to the spec
// now breaks `npm run type-check` until an option exists for it.
type UncoveredImportField = Exclude<ImportField, (typeof IMPORT_FIELDS)[number]['value']>;
type AssertNoUncoveredImportFields<T extends never> = T;
export type _ImportFieldsAreExhaustive = AssertNoUncoveredImportFields<UncoveredImportField>;

type Step = 'upload' | 'mapping' | 'preview' | 'result';
type Mode = 'csv' | 'json';

export default function ImportPage() {
  const { t } = useTranslation(['import', 'common']);
  const [mode, setMode] = useState<Mode>('csv');
  const [step, setStep] = useState<Step>('upload');
  const [uploadData, setUploadData] = useState<ImportUploadResponse | null>(null);
  const [mappings, setMappings] = useState<ImportColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [jsonResult, setJsonResult] = useState<ImportJSONResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useUploadImport();
  const preview = usePreviewImport();
  const confirm = useConfirmImport();
  const restore = useRestoreJSON();

  const handleFileSelect = async (file: File) => {
    setError(null);
    try {
      const data = await upload.mutateAsync(file);
      setUploadData(data);
      setMappings(data.suggestedMappings || []);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || t('uploadFailed'));
    }
  };

  // Columns the file has that no mapping covers. Counted from the file's own
  // column list rather than the mapping list, since a column with no entry at
  // all and one explicitly set to "skip" are the same thing to the importer.
  const unmappedColumnCount = (uploadData?.columns ?? []).filter((col) => {
    const mapping = mappings.find((m) => m.sourceColumn === col);
    return !mapping || mapping.targetField === 'ignore';
  }).length;

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.sourceColumn === sourceColumn);
      if (existing) {
        return prev.map((m) =>
          m.sourceColumn === sourceColumn ? { ...m, targetField: targetField as any } : m
        );
      }
      return [...prev, { sourceColumn, targetField: targetField as any }];
    });
  };

  const handlePreview = async () => {
    if (!uploadData) return;
    setError(null);
    try {
      const data = await preview.mutateAsync({
        uploadToken: uploadData.uploadToken,
        mappings: mappings.filter((m) => m.targetField !== 'ignore'),
        skipDuplicates: true,
      });
      setPreviewData(data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || t('previewFailed'));
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setError(null);
    try {
      const res = await confirm.mutateAsync({
        uploadToken: previewData.uploadToken,
      });
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err.message || t('importFailedShort'));
    }
  };

  const handleReset = () => {
    setStep('upload');
    setUploadData(null);
    setMappings([]);
    setPreviewData(null);
    setResult(null);
    setJsonResult(null);
    setError(null);
  };

  const handleSwitchMode = (next: Mode) => {
    if (next === mode) return;
    handleReset();
    setMode(next);
  };

  const handleJSONFileSelect = async (file: File) => {
    setError(null);
    setJsonResult(null);
    try {
      const data = await restore.mutateAsync(file);
      setJsonResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('restoreFailed');
      setError(message);
    }
  };

  const handleFileRejected = (file: File, accept: string) => {
    setError(t('unsupportedFileType', 'Unsupported file: {{name}}. Expected {{accept}}.', {
      name: file.name,
      accept,
    }));
  };

  return (
    <PageWrapper>
      <PageHeader
        title={t('importFlights')}
        subtitle={t('pageSubtitle')}
        titleAdornment={<HelpLink topic="import-export" />}
      />

      {/* Mode tabs: CSV flight import vs. full JSON backup restore. The two
          flows share zero state and reset each other, which keeps the
          underlying step machine simple. */}
      <div
        role="tablist"
        aria-label={t('modeTabsLabel')}
        className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700"
      >
        <button
          role="tab"
          aria-selected={mode === 'csv'}
          onClick={() => handleSwitchMode('csv')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px] ${
            mode === 'csv'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t('modeCsv')}
        </button>
        <button
          role="tab"
          aria-selected={mode === 'json'}
          onClick={() => handleSwitchMode('json')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px] ${
            mode === 'json'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t('modeJson')}
        </button>
      </div>

      {/* Step indicator (CSV flow only) */}
      {mode === 'csv' && (
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['upload', 'mapping', 'preview', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            )}
            <span
              className={`px-3 py-1 rounded-full ${
                step === s
                  ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {i + 1}. {s === 'upload' ? t('uploadCsv') : s === 'mapping' ? t('stepMapColumns') : s === 'preview' ? t('preview') : t('done')}
            </span>
          </div>
        ))}
      </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* JSON Restore flow — single-step upload, immediate result. */}
      {mode === 'json' && !jsonResult && (
        <FileDropzone
          accept={JSON_ACCEPT}
          disabled={restore.isPending}
          onFileSelected={handleJSONFileSelect}
          onFileRejected={(file) => handleFileRejected(file, JSON_ACCEPT)}
          buttonLabel={
            restore.isPending
              ? t('restoringJson')
              : t('selectJsonFile')
          }
          hint={t('dropHintJson')}
          className="card text-center py-12"
        >
          <DatabaseBackup className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t('restoreJsonTitle')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-2 max-w-md mx-auto">
            {t('restoreJsonDescription')}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 max-w-md mx-auto">
            {t('restoreJsonNote')}
          </p>
        </FileDropzone>
      )}

      {mode === 'json' && jsonResult && (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 dark:text-green-400" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t('restoreJsonSuccess')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {t('restoreJsonSummary')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
            <SummaryCard
              label={t('restoreSummaryAircraftImported')}
              value={jsonResult.aircraftImported}
              color="green"
            />
            <SummaryCard
              label={t('restoreSummaryAircraftSkipped')}
              value={jsonResult.aircraftSkipped}
              color="amber"
            />
            <SummaryCard
              label={t('restoreSummaryLicenses')}
              value={jsonResult.licensesImported}
              color="green"
            />
            <SummaryCard
              label={t('restoreSummaryClassRatings')}
              value={jsonResult.classRatingsImported}
              color="green"
            />
            <SummaryCard
              label={t('restoreSummaryCredentials')}
              value={jsonResult.credentialsImported}
              color="green"
            />
            <SummaryCard
              label={t('restoreSummaryFlights')}
              value={jsonResult.flightsImported}
              color="green"
            />
            <SummaryCard
              label={t('restoreSummaryCrew')}
              value={jsonResult.crewMembersImported}
              color="green"
            />
          </div>

          <button onClick={handleReset} className="btn-primary">
            {t('restoreAnother')}
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {mode === 'csv' && step === 'upload' && (
        <div className="space-y-4">
          <FileDropzone
            accept={CSV_ACCEPT}
            disabled={upload.isPending}
            onFileSelected={handleFileSelect}
            onFileRejected={(file) => handleFileRejected(file, CSV_ACCEPT)}
            buttonLabel={upload.isPending ? t('importing') : t('selectFile')}
            hint={t('dropHintCsv')}
            className="card text-center py-12"
          >
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('uploadCsv')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {t('uploadCsvDescription')}
            </p>
          </FileDropzone>

          <SupportedLogbooks />
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {mode === 'csv' && step === 'mapping' && uploadData && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('columnMapping')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {uploadData.detectedTemplate
                    ? t('formatDetected', { name: uploadData.detectedTemplate.name })
                    : t('formatNotDetected')}
                  {' · '}{t('rowsDetected', { count: uploadData.totalRows })}
                </p>
              </div>
              <button onClick={handleReset} className="btn-ghost btn-sm min-h-[44px]">{t('startOver')}</button>
            </div>

            {/* Unmapped columns are the reason an import loses data silently, so
                say how many there are before the pilot scrolls a long list. */}
            {unmappedColumnCount > 0 && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 text-sm">
                {t('unmappedColumns', { count: unmappedColumnCount })}
              </div>
            )}

            <div className="space-y-2">
              {uploadData.columns.map((col) => {
                const mapping = mappings.find((m) => m.sourceColumn === col);
                return (
                  <div key={col} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={col}>
                      {col}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    <select
                      value={mapping?.targetField || 'ignore'}
                      onChange={(e) => updateMapping(col, e.target.value)}
                      className="input text-sm w-48"
                    >
                      {IMPORT_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview rows */}
          {uploadData.previewRows.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('previewRows', { count: uploadData.previewRows.length })}</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {uploadData.columns.slice(0, 8).map((col) => (
                        <th key={col} className="px-2 py-1 text-left text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadData.previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        {uploadData.columns.slice(0, 8).map((col) => (
                          <td key={col} className="px-2 py-1 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{row[col] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handlePreview} disabled={preview.isPending} className="btn-primary flex-1">
              {preview.isPending ? t('validating') : t('validatePreview')}
            </button>
            <button onClick={handleReset} className="btn-secondary">{t('common:cancel')}</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {mode === 'csv' && step === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label={t('previewSummary.totalRows')} value={previewData.totalRows} />
            <SummaryCard label={t('previewSummary.valid')} value={previewData.validCount} color="green" />
            <SummaryCard label={t('previewSummary.duplicates')} value={previewData.duplicateCount} color="amber" />
            <SummaryCard label={t('previewSummary.errors')} value={previewData.errorCount} color="red" />
          </div>

          <div className="card">
            <h2 className="section-title mb-4">{t('preview')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.row')}</th>
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.status')}</th>
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.date')}</th>
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.aircraft')}</th>
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.route')}</th>
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.crew')}</th>
                    <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('previewTable.details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.flights.slice(0, 50).map((f) => (
                    <tr key={f.rowIndex} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{f.rowIndex}</td>
                      <td className="px-3 py-2">
                        <span className={`badge text-xs ${
                          f.status === 'valid' ? 'badge-current' :
                          f.status === 'duplicate' ? 'badge-expiring' :
                          'badge-expired'
                        }`}>
                          {t(`previewStatus.${f.status}`, f.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{f.flight.date || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{f.flight.aircraftReg || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {f.flight.departureIcao || '?'}
                        <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        {f.flight.arrivalIcao || '?'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {f.flight.crewMembers && f.flight.crewMembers.length > 0 ? (
                          f.flight.crewMembers.map((cm, i) => (
                            <span key={i} className="inline-block mr-1">
                              <span className="font-medium text-slate-600 dark:text-slate-300">{cm.name}</span>
                              <span className="text-slate-400 dark:text-slate-500"> ({cm.role})</span>
                              {i < f.flight.crewMembers!.length - 1 && ', '}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {f.status === 'error' && f.errors?.map((e, i) => (
                          <span key={i} className="text-red-600 dark:text-red-400">{e.field}: {e.message}; </span>
                        ))}
                        {f.status === 'duplicate' && <span>{t('alreadyLogged')}</span>}
                        {f.status === 'valid' && f.flight.totalTime != null && `${Math.floor(f.flight.totalTime / 60)}h ${f.flight.totalTime % 60}m`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.flights.length > 50 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{t('showingFirstRows', { shown: 50, count: previewData.flights.length })}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirm.isPending || previewData.validCount === 0}
              className="btn-primary flex-1"
            >
              {confirm.isPending ? t('importing') : t('importCount', { count: previewData.validCount })}
            </button>
            <button onClick={() => setStep('mapping')} className="btn-secondary">{t('common:back')}</button>
            <button onClick={handleReset} className="btn-ghost">{t('common:cancel')}</button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {mode === 'csv' && step === 'result' && result && (
        <div className="card text-center py-12">
          <div className="mb-4">
            {result.status === 'completed' ? (
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 dark:text-green-400" strokeWidth={1.5} aria-hidden="true" />
            ) : result.status === 'partial' ? (
              <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 dark:text-amber-400" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <XCircle className="w-12 h-12 mx-auto text-red-500 dark:text-red-400" strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {result.status === 'completed' ? t('importSuccess', { count: result.importedCount }) :
             result.status === 'partial' ? t('partialImport') : t('importFailed')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-lg mx-auto mt-6 mb-8">
            <SummaryCard label={t('summary.imported')} value={result.importedCount} color="green" />
            <SummaryCard label={t('summary.contacts')} value={result.contactsCreated ?? 0} color="green" />
            <SummaryCard label={t('summary.skipped')} value={result.skippedCount} color="amber" />
            <SummaryCard label={t('summary.errors')} value={result.errorCount} color="red" />
            <SummaryCard label={t('summary.duplicates')} value={result.duplicateCount} />
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="text-left max-w-lg mx-auto mb-6">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">{t('summary.errors')}</h3>
              <div className="text-xs space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-red-600 dark:text-red-400">
                    {t('errorRow', { row: e.rowIndex, field: e.field, message: e.message })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleReset} className="btn-primary">{t('importAnother', 'Import Another File')}</button>
        </div>
      )}

      {/* Past imports — always visible below the wizard so a pilot can check
          what a previous file actually did without re-running it. */}
      <ImportHistory />
    </PageWrapper>
  );
}

function ImportHistory() {
  const { t } = useTranslation('import');
  const { fmtDateTime } = useFormatPrefs();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useImportHistory(page, 10);

  // An empty first page means no imports at all — hide the section entirely
  // rather than showing an empty shell under the wizard.
  if (isLoading || !data || (data.pagination.total === 0)) return null;

  return (
    <div className="card mt-8" data-testid="import-history">
      <h2 className="section-title mb-1">{t('history.title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {t('history.subtitle')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('history.date')}</th>
              <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('history.file')}</th>
              <th className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium">{t('history.status')}</th>
              <th className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 font-medium">{t('history.imported')}</th>
              <th className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 font-medium">{t('history.skipped')}</th>
              <th className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 font-medium">{t('history.errors')}</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((imp) => (
              <tr key={imp.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">{fmtDateTime(imp.createdAt)}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[220px] truncate" title={imp.fileName}>{imp.fileName}</td>
                <td className="px-3 py-2">
                  <span className={`badge text-xs ${
                    imp.status === 'completed' ? 'badge-current' :
                    imp.status === 'partial' ? 'badge-expiring' :
                    'badge-expired'
                  }`}>
                    {t(`history.statusLabels.${imp.status}`, imp.status)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-green-600 dark:text-green-400">{imp.importedCount}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{imp.skippedCount}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${imp.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>{imp.errorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost btn-sm"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {t('history.previous')}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {t('history.pageOf', { page: data.pagination.page, total: data.pagination.totalPages, defaultValue: 'Page {{page}} of {{total}}' })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page >= data.pagination.totalPages}
            className="btn-ghost btn-sm"
          >
            {t('history.next')}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClass = color === 'green' ? 'text-green-600 dark:text-green-400' :
    color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
    color === 'red' ? 'text-red-600 dark:text-red-400' :
    'text-slate-800 dark:text-slate-100';
  return (
    <div className="card text-center py-3">
      <div className={`text-2xl font-bold font-mono tabular-nums ${colorClass}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}
