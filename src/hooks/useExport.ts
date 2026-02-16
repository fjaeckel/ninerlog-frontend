import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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

export const exportFlightsCSV = () =>
  downloadFile(`${API_BASE}/exports/csv`, `pilotlog_flights_${new Date().toISOString().slice(0, 10)}.csv`);

export const exportDataJSON = () =>
  downloadFile(`${API_BASE}/exports/json`, `pilotlog_backup_${new Date().toISOString().slice(0, 10)}.json`);

export const exportFlightsPDF = () =>
  downloadFile(`${API_BASE}/exports/pdf`, `pilotlog_logbook_${new Date().toISOString().slice(0, 10)}.pdf`);
