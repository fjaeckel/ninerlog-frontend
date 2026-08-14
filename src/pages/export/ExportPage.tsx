import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportFlightsCSV, exportDataJSON, exportFlightsPDF, exportContactsVCard } from '../../hooks/useExport';

export default function ExportPage() {
  const { t } = useTranslation('reports');
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfFormat, setPdfFormat] = useState<'easa' | 'faa' | 'summary'>('easa');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'a5' | 'letter'>('a4');
  const [pdfLayout, setPdfLayout] = useState<'spread' | 'single'>('spread');
  const [pdfRowsPerPage, setPdfRowsPerPage] = useState<string>('');
  const [csvFormat, setCsvFormat] = useState<'standard' | 'easa' | 'faa'>('standard');

  const handleExport = async (format: 'csv' | 'json' | 'pdf' | 'vcard') => {
    setExporting(format);
    setError(null);
    try {
      if (format === 'csv') {
        await exportFlightsCSV(csvFormat);
      } else if (format === 'pdf') {
        const rows = pdfRowsPerPage ? Number(pdfRowsPerPage) : undefined;
        await exportFlightsPDF(undefined, pdfFormat, pdfPageSize, pdfLayout, rows);
      } else if (format === 'vcard') {
        await exportContactsVCard();
      } else {
        await exportDataJSON();
      }
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="mb-6">
        <h1 className="page-title">{t('export.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('export.subtitle', 'Download your flight data in various formats')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* CSV Export */}
        <div className="card">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.csvTitle', 'Flight Log CSV')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t('export.csvDescription', 'Export all flights as a CSV file. Choose a column format for your authority.')}
          </p>
          <select
            value={csvFormat}
            onChange={(e) => setCsvFormat(e.target.value as 'standard' | 'easa' | 'faa')}
            className="input mb-3 text-sm"
          >
            <option value="standard">{t('export.standardCsv')} (ForeFlight-compatible)</option>
            <option value="easa">{t('export.easaLogbook', 'EASA (AMC1 FCL.050 columns)')}</option>
            <option value="faa">{t('export.faaLogbook', 'FAA (ASA/Jeppesen columns)')}</option>
          </select>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting === 'csv'}
            className="btn-primary w-full"
          >
            {exporting === 'csv' ? t('export.downloading') : t('export.download') + ' CSV'}
          </button>
        </div>

        {/* JSON Backup */}
        <div className="card">
          <div className="text-3xl mb-3">💾</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.jsonBackup', 'Full Data Backup')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t('export.jsonDescription', 'Export everything — flights, aircraft, licenses, class ratings, and credentials as a JSON backup file.')}
          </p>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting === 'json'}
            className="btn-secondary w-full"
          >
            {exporting === 'json' ? t('export.downloading') : t('export.download') + ' JSON Backup'}
          </button>
        </div>

        {/* PDF Logbook */}
        <div className="card">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.pdfTitle', 'PDF Logbook')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t('export.pdfDescription', 'Generate a formatted logbook PDF. Print it, sign it, and use it as a paper logbook.')}
          </p>
          <select
            value={pdfFormat}
            onChange={(e) => setPdfFormat(e.target.value as 'easa' | 'faa' | 'summary')}
            className="input mb-3 text-sm"
            aria-label={t('export.pdfFormat', 'PDF format')}
          >
            <option value="easa">{t('export.easaLogbook')}</option>
            <option value="faa">{t('export.faaLogbook')}</option>
            <option value="summary">{t('export.summaryReport')}</option>
          </select>
          <select
            value={pdfPageSize}
            onChange={(e) => setPdfPageSize(e.target.value as 'a4' | 'a5' | 'letter')}
            className="input mb-3 text-sm"
            aria-label={t('export.pdfPageSize', 'Page size')}
          >
            <option value="a4">{t('export.pageSizeA4', 'A4 (landscape)')}</option>
            <option value="a5">{t('export.pageSizeA5', 'A5 (landscape)')}</option>
            <option value="letter">{t('export.pageSizeLetter', 'US Letter (landscape)')}</option>
          </select>
          {pdfFormat !== 'summary' && (
            <>
              <select
                value={pdfLayout}
                onChange={(e) => setPdfLayout(e.target.value as 'spread' | 'single')}
                className="input mb-3 text-sm"
                aria-label={t('export.pdfLayout', 'Page layout')}
              >
                <option value="spread">{t('export.layoutSpread', 'Two-page spread (duplex printing)')}</option>
                <option value="single">{t('export.layoutSingle', 'Single page (all columns on one page)')}</option>
              </select>
              <input
                type="number"
                min={5}
                max={50}
                value={pdfRowsPerPage}
                onChange={(e) => setPdfRowsPerPage(e.target.value)}
                placeholder={t('export.rowsPerPageAuto', 'Rows per page (auto)')}
                className="input mb-3 text-sm"
                aria-label={t('export.rowsPerPage', 'Rows per page')}
              />
            </>
          )}
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
            className="btn-secondary w-full"
          >
            {exporting === 'pdf' ? t('export.downloading') : t('export.download') + ' PDF Logbook'}
          </button>
        </div>

        {/* vCard address book */}
        <div className="card">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.vcardTitle', 'People (vCard)')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t('export.vcardDescription', 'Export the crew, instructors and passengers from your logbook as a .vcf address book for your phone or mail client.')}
          </p>
          <button
            onClick={() => handleExport('vcard')}
            disabled={exporting === 'vcard'}
            className="btn-secondary w-full"
          >
            {exporting === 'vcard' ? t('export.downloading') : t('export.download') + ' vCard'}
          </button>
        </div>

        {/* Import Link */}
        <div className="card">
          <div className="text-3xl mb-3">📥</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.importTitle', 'Import Flights')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t('export.importDescription', 'Import flights from ForeFlight, CSV files, or other logbook exports. Auto-detects format and column mapping.')}
          </p>
          <a href="/import" className="btn-ghost w-full inline-flex items-center justify-center">
            Go to Import →
          </a>
        </div>
      </div>

      <div className="mt-8 card bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('export.aboutTitle', 'About Exports')}</h3>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <li>• <strong>CSV Standard</strong> — ForeFlight-compatible with all flight fields. Opens in Excel, Google Sheets, or any spreadsheet app.</li>
          <li>• <strong>CSV EASA</strong> — AMC1 FCL.050 column layout (24 columns: SP-SE/ME, Multi-Pilot, PIC Name, Co-Pilot, Instructor, FSTD).</li>
          <li>• <strong>CSV FAA</strong> — ASA/Jeppesen standard logbook columns with decimal hours.</li>
          <li>• <strong>PDF EASA</strong> — Full AMC1 FCL.050 compliant logbook with SP-SE/ME split, FSTD sessions, and page totals.</li>
          <li>• <strong>PDF FAA</strong> — Standard ASA/Jeppesen layout with approaches, holds, and IPC/Flight Review markers.</li>
          <li>• <strong>JSON Backup</strong> — Complete data snapshot including aircraft fleet, licenses with class ratings, and credentials.</li>
          <li>• <strong>vCard</strong> — Your people as a standard .vcf address book, each card tagged with the roles they flew in. Re-importing a later export updates the same cards instead of duplicating them.</li>
          <li>• Your data is yours — export anytime, no restrictions, no fees.</li>
        </ul>
      </div>
    </div>
  );
}
