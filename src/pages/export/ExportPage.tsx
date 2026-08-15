import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  exportFlightsCSV,
  exportDataJSON,
  exportFlightsPDF,
  exportLogbookForTarget,
  exportPortabilityArchive,
  useExportTargets,
  type ExportTargetId,
} from '../../hooks/useExport';

export default function ExportPage() {
  const { t } = useTranslation('reports');
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfFormat, setPdfFormat] = useState<'easa' | 'faa' | 'summary'>('easa');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'a5' | 'letter'>('a4');
  const [pdfLayout, setPdfLayout] = useState<'spread' | 'single'>('spread');
  const [pdfRowsPerPage, setPdfRowsPerPage] = useState<string>('');
  const [csvFormat, setCsvFormat] = useState<'standard' | 'easa' | 'faa'>('standard');

  const { data: targets = [], isLoading: targetsLoading } = useExportTargets();

  const run = async (key: string, action: () => Promise<void>) => {
    setExporting(key);
    setError(null);
    try {
      await action();
    } catch {
      setError(t('export.failed'));
    } finally {
      setExporting(null);
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'pdf') =>
    run(format, () => {
      if (format === 'csv') return exportFlightsCSV(csvFormat);
      if (format === 'pdf') {
        const rows = pdfRowsPerPage ? Number(pdfRowsPerPage) : undefined;
        return exportFlightsPDF(undefined, pdfFormat, pdfPageSize, pdfLayout, rows);
      }
      return exportDataJSON();
    });

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="mb-6">
        <h1 className="page-title">{t('export.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('export.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/*
        Leaving comes first, and says so plainly. A pilot who wants to move to
        another logbook should not have to scroll past three of our own formats
        to find out that we support it.
      */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t('export.moveTitle')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
          {t('export.moveSubtitle')}
        </p>

        <div className="card mb-4 border-brand-200 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-900/10">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="text-3xl leading-none">📦</div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {t('export.archiveTitle')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                {t('export.archiveDescription')}
              </p>
              <button
                onClick={() => run('archive', exportPortabilityArchive)}
                disabled={exporting === 'archive'}
                className="btn-primary w-full sm:w-auto"
              >
                {exporting === 'archive' ? t('export.downloading') : t('export.archiveDownload')}
              </button>
            </div>
          </div>
        </div>

        {targetsLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('export.targetsLoading')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {targets.map((target) => (
              <div key={target.id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    {target.product}
                  </h3>
                  {!target.verified && (
                    <span className="badge-expiring shrink-0" title={t('export.unverifiedHint')}>
                      {t('export.unverified')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 flex-1">
                  {target.notes}
                </p>
                <button
                  onClick={() =>
                    run(target.id, () =>
                      exportLogbookForTarget(target.id as ExportTargetId, target.extension),
                    )
                  }
                  disabled={exporting === target.id}
                  className="btn-secondary w-full"
                >
                  {exporting === target.id
                    ? t('export.downloading')
                    : t('export.downloadFor', { product: target.product })}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          {t('export.lossyNotice')}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          {t('export.ownFormatsTitle')}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* CSV Export */}
          <div className="card">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('export.csvTitle')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t('export.csvDescription')}
            </p>
            <select
              value={csvFormat}
              onChange={(e) => setCsvFormat(e.target.value as 'standard' | 'easa' | 'faa')}
              className="input mb-3 text-sm"
              aria-label={t('export.format')}
            >
              <option value="standard">{t('export.standardCsv')}</option>
              <option value="easa">{t('export.easaLogbook')}</option>
              <option value="faa">{t('export.faaLogbook')}</option>
            </select>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting === 'csv'}
              className="btn-secondary w-full"
            >
              {exporting === 'csv' ? t('export.downloading') : t('export.downloadCsv')}
            </button>
          </div>

          {/* JSON Backup */}
          <div className="card">
            <div className="text-3xl mb-3">💾</div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('export.jsonBackup')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {t('export.jsonDescription')}
            </p>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting === 'json'}
              className="btn-secondary w-full"
            >
              {exporting === 'json' ? t('export.downloading') : t('export.downloadJson')}
            </button>
          </div>

          {/* PDF Logbook */}
          <div className="card">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('export.pdfTitle')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {t('export.pdfDescription')}
            </p>
            <select
              value={pdfFormat}
              onChange={(e) => setPdfFormat(e.target.value as 'easa' | 'faa' | 'summary')}
              className="input mb-3 text-sm"
              aria-label={t('export.pdfFormat')}
            >
              <option value="easa">{t('export.easaLogbook')}</option>
              <option value="faa">{t('export.faaLogbook')}</option>
              <option value="summary">{t('export.summaryReport')}</option>
            </select>
            <select
              value={pdfPageSize}
              onChange={(e) => setPdfPageSize(e.target.value as 'a4' | 'a5' | 'letter')}
              className="input mb-3 text-sm"
              aria-label={t('export.pdfPageSize')}
            >
              <option value="a4">{t('export.pageSizeA4')}</option>
              <option value="a5">{t('export.pageSizeA5')}</option>
              <option value="letter">{t('export.pageSizeLetter')}</option>
            </select>
            {pdfFormat !== 'summary' && (
              <>
                <select
                  value={pdfLayout}
                  onChange={(e) => setPdfLayout(e.target.value as 'spread' | 'single')}
                  className="input mb-3 text-sm"
                  aria-label={t('export.pdfLayout')}
                >
                  <option value="spread">{t('export.layoutSpread')}</option>
                  <option value="single">{t('export.layoutSingle')}</option>
                </select>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={pdfRowsPerPage}
                  onChange={(e) => setPdfRowsPerPage(e.target.value)}
                  placeholder={t('export.rowsPerPageAuto')}
                  className="input mb-3 text-sm"
                  aria-label={t('export.rowsPerPage')}
                />
              </>
            )}
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting === 'pdf'}
              className="btn-secondary w-full"
            >
              {exporting === 'pdf' ? t('export.downloading') : t('export.downloadPdf')}
            </button>
          </div>

          {/* Import Link */}
          <div className="card">
            <div className="text-3xl mb-3">📥</div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('export.importTitle')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {t('export.importDescription')}
            </p>
            <a href="/import" className="btn-ghost w-full inline-flex items-center justify-center">
              {t('export.goToImport')}
            </a>
          </div>
        </div>
      </section>

      <div className="mt-8 card bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {t('export.aboutTitle')}
        </h3>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <li>• {t('export.aboutArchive')}</li>
          <li>• {t('export.aboutTargets')}</li>
          <li>• {t('export.aboutCsvStandard')}</li>
          <li>• {t('export.aboutCsvEasa')}</li>
          <li>• {t('export.aboutCsvFaa')}</li>
          <li>• {t('export.aboutPdfEasa')}</li>
          <li>• {t('export.aboutPdfFaa')}</li>
          <li>• {t('export.aboutJson')}</li>
          <li className="text-slate-600 dark:text-slate-300 font-medium pt-1">
            • {t('export.aboutYourData')}
          </li>
        </ul>
      </div>
    </div>
  );
}
