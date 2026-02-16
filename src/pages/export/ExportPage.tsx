import { useState } from 'react';
import { exportFlightsCSV, exportDataJSON, exportFlightsPDF } from '../../hooks/useExport';

export default function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setExporting(format);
    setError(null);
    try {
      if (format === 'csv') {
        await exportFlightsCSV();
      } else if (format === 'pdf') {
        await exportFlightsPDF();
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Export all flights as a CSV file. Compatible with ForeFlight, MyFlightbook, and spreadsheet applications.
          </p>
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Generate an EASA-style formatted logbook PDF. Print it, sign it, and use it as a paper logbook.
          </p>
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
          <li>• <strong>CSV</strong> — Includes all flight fields (times, landings, instrument, crew info). Opens in Excel, Google Sheets, or any spreadsheet app.</li>
          <li>• <strong>PDF Logbook</strong> — EASA FCL.050 formatted logbook with page totals and grand summary. Print and sign for a paper backup.</li>
          <li>• <strong>JSON Backup</strong> — Complete data snapshot including aircraft fleet, licenses with class ratings, and credentials. Use for migration or archival.</li>
          <li>• Your data is yours — export anytime, no restrictions, no fees.</li>
        </ul>
      </div>
    </div>
  );
}
