import { useState, useRef } from 'react';
import { useUploadImport, usePreviewImport, useConfirmImport } from '../../hooks/useImport';
import { useLicenses } from '../../hooks/useLicenses';
import type { ImportUploadResponse, ImportPreviewResponse, ImportResult, ImportColumnMapping } from '../../hooks/useImport';

const IMPORT_FIELDS = [
  { value: 'ignore', label: '— Skip —' },
  { value: 'date', label: 'Date' },
  { value: 'aircraftReg', label: 'Aircraft Registration' },
  { value: 'aircraftType', label: 'Aircraft Type' },
  { value: 'departureIcao', label: 'Departure ICAO' },
  { value: 'arrivalIcao', label: 'Arrival ICAO' },
  { value: 'offBlockTime', label: 'Off-Block Time' },
  { value: 'onBlockTime', label: 'On-Block Time' },
  { value: 'departureTime', label: 'Takeoff Time' },
  { value: 'arrivalTime', label: 'Landing Time' },
  { value: 'totalTime', label: 'Total Time' },
  { value: 'isPic', label: 'PIC' },
  { value: 'isDual', label: 'Dual' },
  { value: 'nightTime', label: 'Night Time' },
  { value: 'ifrTime', label: 'IFR Time' },
  { value: 'landingsDay', label: 'Day Landings' },
  { value: 'landingsNight', label: 'Night Landings' },
  { value: 'remarks', label: 'Remarks' },
];

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [uploadData, setUploadData] = useState<ImportUploadResponse | null>(null);
  const [mappings, setMappings] = useState<ImportColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: licenses } = useLicenses();
  const upload = useUploadImport();
  const preview = usePreviewImport();
  const confirm = useConfirmImport();

  const licenseId = selectedLicenseId;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const data = await upload.mutateAsync(file);
      setUploadData(data);
      setMappings(data.suggestedMappings || []);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

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
    if (!uploadData || !licenseId) return;
    setError(null);
    try {
      const data = await preview.mutateAsync({
        uploadToken: uploadData.uploadToken,
        licenseId,
        mappings: mappings.filter((m) => m.targetField !== 'ignore'),
        skipDuplicates: true,
      });
      setPreviewData(data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Preview failed');
    }
  };

  const handleConfirm = async () => {
    if (!previewData || !licenseId) return;
    setError(null);
    try {
      const res = await confirm.mutateAsync({
        uploadToken: previewData.uploadToken,
        licenseId,
      });
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setUploadData(null);
    setMappings([]);
    setPreviewData(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="mb-6">
        <h1 className="page-title">Import Flights</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Import flight logs from CSV files (including ForeFlight exports)
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['upload', 'mapping', 'preview', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300 dark:text-slate-600">→</span>}
            <span
              className={`px-3 py-1 rounded-full ${
                step === s
                  ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {i + 1}. {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : s === 'preview' ? 'Preview' : 'Done'}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Upload Flight Log File</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Supports CSV files including ForeFlight logbook exports. Maximum file size: 10 MB.
          </p>
          <div className="mb-4">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Import into license</label>
            <select
              value={licenseId}
              onChange={(e) => setSelectedLicenseId(e.target.value)}
              className="input max-w-xs mx-auto"
            >
              <option value="">Select license</option>
              {licenses?.map((lic) => (
                <option key={lic.id} value={lic.id}>
                  {lic.regulatoryAuthority} {lic.licenseType} — {lic.licenseNumber}
                </option>
              ))}
            </select>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!licenseId || upload.isPending}
            className="btn-primary"
          >
            {upload.isPending ? 'Uploading...' : 'Choose File'}
          </button>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && uploadData && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Column Mapping</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {uploadData.format === 'FOREFLIGHT_CSV' ? '✈ ForeFlight format detected — mappings pre-filled' : 'Map each column to a flight log field'}
                  {' · '}{uploadData.totalRows} rows found
                </p>
              </div>
              <button onClick={handleReset} className="btn-ghost btn-sm text-xs">Start Over</button>
            </div>

            <div className="space-y-2">
              {uploadData.columns.map((col) => {
                const mapping = mappings.find((m) => m.sourceColumn === col);
                return (
                  <div key={col} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={col}>
                      {col}
                    </span>
                    <span className="text-slate-400">→</span>
                    <select
                      value={mapping?.targetField || 'ignore'}
                      onChange={(e) => updateMapping(col, e.target.value)}
                      className="input text-sm w-48"
                    >
                      {IMPORT_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
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
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Preview (first {uploadData.previewRows.length} rows)</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {uploadData.columns.slice(0, 8).map((col) => (
                        <th key={col} className="px-2 py-1 text-left text-slate-500 truncate max-w-[120px]">{col}</th>
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
              {preview.isPending ? 'Validating...' : 'Validate & Preview'}
            </button>
            <button onClick={handleReset} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Total Rows" value={previewData.totalRows} />
            <SummaryCard label="Valid" value={previewData.validCount} color="green" />
            <SummaryCard label="Duplicates" value={previewData.duplicateCount} color="amber" />
            <SummaryCard label="Errors" value={previewData.errorCount} color="red" />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Import Preview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Row</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Status</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Date</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Aircraft</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Route</th>
                    <th className="px-3 py-2 text-left text-slate-500 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.flights.slice(0, 50).map((f) => (
                    <tr key={f.rowIndex} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{f.rowIndex}</td>
                      <td className="px-3 py-2">
                        <span className={`badge text-xs ${
                          f.status === 'valid' ? 'badge-current' :
                          f.status === 'duplicate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{f.flight.date || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{f.flight.aircraftReg || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {f.flight.departureIcao || '?'} → {f.flight.arrivalIcao || '?'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {f.status === 'error' && f.errors?.map((e, i) => (
                          <span key={i} className="text-red-600 dark:text-red-400">{e.field}: {e.message}; </span>
                        ))}
                        {f.status === 'duplicate' && <span>Already logged</span>}
                        {f.status === 'valid' && f.flight.totalTime && `${f.flight.totalTime}h`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.flights.length > 50 && (
              <p className="text-xs text-slate-400 mt-2">Showing first 50 of {previewData.flights.length} rows</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirm.isPending || previewData.validCount === 0}
              className="btn-primary flex-1"
            >
              {confirm.isPending ? 'Importing...' : `Import ${previewData.validCount} Flight${previewData.validCount !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => setStep('mapping')} className="btn-secondary">Back</button>
            <button onClick={handleReset} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">
            {result.status === 'completed' ? '✅' : result.status === 'partial' ? '⚠' : '❌'}
          </div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {result.status === 'completed' ? 'Import Complete!' :
             result.status === 'partial' ? 'Partially Imported' : 'Import Failed'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-md mx-auto mt-6 mb-8">
            <SummaryCard label="Imported" value={result.importedCount} color="green" />
            <SummaryCard label="Skipped" value={result.skippedCount} color="amber" />
            <SummaryCard label="Errors" value={result.errorCount} color="red" />
            <SummaryCard label="Duplicates" value={result.duplicateCount} />
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="text-left max-w-lg mx-auto mb-6">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Errors</h3>
              <div className="text-xs space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-red-600 dark:text-red-400">
                    Row {e.rowIndex}: {e.field} — {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleReset} className="btn-primary">Import Another File</button>
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
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}
