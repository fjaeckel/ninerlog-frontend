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

export const exportFlightsPDF = (logbookLicenseId?: string, format?: 'easa' | 'faa' | 'summary') => {
  const params = new URLSearchParams();
  if (logbookLicenseId) params.set('logbookLicenseId', logbookLicenseId);
  if (format) params.set('format', format);
  const query = params.toString() ? `?${params.toString()}` : '';
  return downloadFile(`${API_BASE}/exports/pdf${query}`, `ninerlog_logbook_${new Date().toISOString().slice(0, 10)}.pdf`);
};
