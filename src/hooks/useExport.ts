import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL as API_BASE } from '../lib/config';

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

export const exportFlightsCSV = (format?: 'standard' | 'easa' | 'faa') => {
  const params = format && format !== 'standard' ? `?format=${format}` : '';
  return downloadFile(`${API_BASE}/exports/csv${params}`, `ninerlog_flights_${new Date().toISOString().slice(0, 10)}.csv`);
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
  // Layout and row density only apply to the logbook layouts; the summary
  // format ignores both server-side, so don't send them.
  if (layout && format !== 'summary') params.set('layout', layout);
  if (rowsPerPage && format !== 'summary') params.set('rows_per_page', String(rowsPerPage));
  const query = params.toString() ? `?${params.toString()}` : '';
  return downloadFile(`${API_BASE}/exports/pdf${query}`, `ninerlog_logbook_${new Date().toISOString().slice(0, 10)}.pdf`);
};
