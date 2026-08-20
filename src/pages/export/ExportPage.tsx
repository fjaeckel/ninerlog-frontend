import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, DatabaseBackup, FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { exportFlightsCSV, exportDataJSON, exportFlightsPDF } from '../../hooks/useExport';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';

export default function ExportPage() {
  const { t } = useTranslation('reports');
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfFormat, setPdfFormat] = useState<'easa' | 'faa' | 'summary'>('easa');
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'a5' | 'letter'>('a4');
  const [pdfLayout, setPdfLayout] = useState<'spread' | 'single'>('spread');
  const [pdfRowsPerPage, setPdfRowsPerPage] = useState<string>('');
  const [csvFormat, setCsvFormat] = useState<'standard' | 'easa' | 'faa'>('standard');

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setExporting(format);
    setError(null);
    try {
      if (format === 'csv') {
        await exportFlightsCSV(csvFormat);
      } else if (format === 'pdf') {
        const rows = pdfRowsPerPage ? Number(pdfRowsPerPage) : undefined;
        await exportFlightsPDF(undefined, pdfFormat, pdfPageSize, pdfLayout, rows);
      } else {
        await exportDataJSON();
      }
    } catch {
      setError(t('export.failed'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <PageWrapper>
      <PageHeader title={t('export.title')} subtitle={t('export.subtitle')} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {/* CSV Export */}
        <div className="card flex flex-col h-full">
          <FileSpreadsheet className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.csvTitle')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t('export.csvDescription')}
          </p>
          <div className="flex-1" />
          <select
            value={csvFormat}
            onChange={(e) => setCsvFormat(e.target.value as 'standard' | 'easa' | 'faa')}
            className="input mb-3 text-sm"
          >
            <option value="standard">{t('export.standardCsv')}</option>
            <option value="easa">{t('export.easaLogbook')}</option>
            <option value="faa">{t('export.faaLogbook')}</option>
          </select>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting === 'csv'}
            className="btn-primary w-full"
          >
            {exporting === 'csv' ? t('export.downloading') : t('export.downloadCsv')}
          </button>
        </div>

        {/* JSON Backup */}
        <div className="card flex flex-col h-full">
          <DatabaseBackup className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.jsonBackup')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t('export.jsonDescription')}
          </p>
          <div className="flex-1" />
          <button
            onClick={() => handleExport('json')}
            disabled={exporting === 'json'}
            className="btn-primary w-full"
          >
            {exporting === 'json' ? t('export.downloading') : t('export.downloadJson')}
          </button>
        </div>

        {/* PDF Logbook */}
        <div className="card flex flex-col h-full">
          <FileText className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.pdfTitle')}</h3>
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
          <div className="flex-1" />
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
            className="btn-primary w-full"
          >
            {exporting === 'pdf' ? t('export.downloading') : t('export.downloadPdf')}
          </button>
        </div>

        {/* Import Link */}
        <div className="card flex flex-col h-full">
          <Upload className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('export.importTitle')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t('export.importDescription')}
          </p>
          <div className="flex-1" />
          <Link to="/import" className="btn-secondary w-full">
            {t('export.goToImport')}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-8 card bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('export.aboutTitle')}</h3>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-5 marker:text-slate-300 dark:marker:text-slate-600">
          {(t('export.aboutItems', { returnObjects: true }) as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </PageWrapper>
  );
}
