import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL as API_BASE } from '../lib/config';
import type { operations } from '../api/schema';

export type FlightSearchCSVQuery = Omit<NonNullable<operations['exportFlightsCSV']['parameters']['query']>, 'totals'>;

async function downloadFile(url: string, filename: string) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export type CSVExportFormat = 'standard' | 'easa' | 'faa' | 'weblogbook';

export const exportFlightsCSV = (format?: CSVExportFormat) => {
  const params = format && format !== 'standard' ? `?format=${format}` : '';
  return downloadFile(`${API_BASE}/exports/csv${params}`, `ninerlog_flights_${new Date().toISOString().slice(0, 10)}.csv`);
};

/** Every flight matching a `GET /flights` search, with a totals row. */
export const exportFlightSearchCSV = (query: FlightSearchCSVQuery) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  params.set('totals', 'true');
  return downloadFile(
    `${API_BASE}/exports/csv?${params.toString()}`,
    `ninerlog_flights_search_${new Date().toISOString().slice(0, 10)}.csv`
  );
};

export const exportDataJSON = () =>
  downloadFile(`${API_BASE}/exports/json`, `ninerlog_backup_${new Date().toISOString().slice(0, 10)}.json`);

export const exportFlightsPDF = (
  logbookLicenseId?: string,
  format?: 'easa' | 'faa' | 'summary',
  pageSize?: 'a4' | 'a5' | 'letter',
  layout?: 'spread' | 'single',
  rowsPerPage?: number,
) => {
  const params = new URLSearchParams();
  if (logbookLicenseId) params.set('logbookLicenseId', logbookLicenseId);
  if (format) params.set('format', format);
  if (pageSize) params.set('page_size', pageSize);
  // Layout and row density: logbook layouts only.
  if (layout && format !== 'summary') params.set('layout', layout);
  if (rowsPerPage && format !== 'summary') params.set('rows_per_page', String(rowsPerPage));
  const query = params.toString() ? `?${params.toString()}` : '';
  return downloadFile(`${API_BASE}/exports/pdf${query}`, `ninerlog_logbook_${new Date().toISOString().slice(0, 10)}.pdf`);
};
