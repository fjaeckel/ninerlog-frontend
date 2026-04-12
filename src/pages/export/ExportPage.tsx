import { useState } from 'react';
import { exportFlightsCSV, exportDataJSON, exportFlightsPDF } from '../../hooks/useExport';

export default function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfFormat, setPdfFormat] = useState<'easa' | 'faa' | 'summary'>('easa');
  const [csvFormat, setCsvFormat] = useState<'standard' | 'easa' | 'faa'>('standard');

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setExporting(format);
    setError(null);
    try {
      if (format === 'csv') {
        await exportFlightsCSV(csvFormat);
      } else if (format === 'pdf') {
        await exportFlightsPDF(undefined, pdfFormat);
      } else {
        await exportDataJSON();
      }
    } catch (err) {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="mb-6">
        <h1 className="page-title">Export Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Download your flight data in various formats
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
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Flight Log CSV</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Export all flights as a CSV file. Choose a column format for your authority.
          </p>
          <select
            value={csvFormat}
            onChange={(e) => setCsvFormat(e.target.value as 'standard' | 'easa' | 'faa')}
            className="input mb-3 text-sm"
          >
            <option value="standard">Standard (ForeFlight-compatible)</option>
            <option value="easa">EASA (AMC1 FCL.050 columns)</option>
            <option value="faa">FAA (ASA/Jeppesen columns)</option>
          </select>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting === 'csv'}
            className="btn-primary w-full"
          >
            {exporting === 'csv' ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>

        {/* JSON Backup */}
        <div className="card">
          <div className="text-3xl mb-3">💾</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Full Data Backup</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Export everything — flights, aircraft, licenses, class ratings, and credentials as a JSON backup file.
          </p>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting === 'json'}
            className="btn-secondary w-full"
          >
            {exporting === 'json' ? 'Exporting...' : 'Download JSON Backup'}
          </button>
        </div>

        {/* PDF Logbook */}
        <div className="card">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">PDF Logbook</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Generate a formatted logbook PDF. Print it, sign it, and use it as a paper logbook.
          </p>
          <select
            value={pdfFormat}
            onChange={(e) => setPdfFormat(e.target.value as 'easa' | 'faa' | 'summary')}
            className="input mb-3 text-sm"
          >
            <option value="easa">EASA Logbook (AMC1 FCL.050)</option>
            <option value="faa">FAA Logbook (ASA/Jeppesen)</option>
            <option value="summary">Summary Report</option>
          </select>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
            className="btn-secondary w-full"
          >
            {exporting === 'pdf' ? 'Generating...' : 'Download PDF Logbook'}
          </button>
        </div>

        {/* Import Link */}
        <div className="card">
          <div className="text-3xl mb-3">📥</div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Import Flights</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Import flights from ForeFlight, CSV files, or other logbook exports. Auto-detects format and column mapping.
          </p>
          <a href="/import" className="btn-ghost w-full inline-flex items-center justify-center">
            Go to Import →
          </a>
        </div>
      </div>

      <div className="mt-8 card bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">About Exports</h3>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <li>• <strong>CSV Standard</strong> — ForeFlight-compatible with all flight fields. Opens in Excel, Google Sheets, or any spreadsheet app.</li>
          <li>• <strong>CSV EASA</strong> — AMC1 FCL.050 column layout (24 columns: SP-SE/ME, Multi-Pilot, PIC Name, Co-Pilot, Instructor, FSTD).</li>
          <li>• <strong>CSV FAA</strong> — ASA/Jeppesen standard logbook columns with decimal hours.</li>
          <li>• <strong>PDF EASA</strong> — Full AMC1 FCL.050 compliant logbook with SP-SE/ME split, FSTD sessions, and page totals.</li>
          <li>• <strong>PDF FAA</strong> — Standard ASA/Jeppesen layout with approaches, holds, and IPC/Flight Review markers.</li>
          <li>• <strong>JSON Backup</strong> — Complete data snapshot including aircraft fleet, licenses with class ratings, and credentials.</li>
          <li>• Your data is yours — export anytime, no restrictions, no fees.</li>
        </ul>
      </div>
    </div>
  );
}
