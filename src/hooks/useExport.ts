import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL as API_BASE } from '../lib/config';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

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

export type ExportTarget = components['schemas']['ExportTarget'];
export type ExportTargetId = components['schemas']['ExportTargetId'];

/**
 * The logbook products this deployment can export to.
 *
 * The list comes from the server rather than being hard-coded here so a newly
 * supported destination — and its caveats, and whether its layout has been
 * confirmed against a live import — appears without a frontend release.
 */
export const useExportTargets = () =>
  useQuery({
    queryKey: ['export-targets'],
    queryFn: async (): Promise<ExportTarget[]> => {
      const { data, error } = await apiClient.GET('/exports/targets', {});
      if (error) throw error;
      return data?.targets ?? [];
    },
    // The registry only changes when the server is redeployed.
    staleTime: 60 * 60 * 1000,
  });

/** Download the logbook in another product's own import format. */
export const exportLogbookForTarget = (target: ExportTargetId, extension = 'csv') =>
  downloadFile(
    `${API_BASE}/exports/logbook?target=${encodeURIComponent(target)}`,
    `ninerlog-${target}-${new Date().toISOString().slice(0, 10)}.${extension}`,
  );

/** Download the complete account as the open, documented portability archive. */
export const exportPortabilityArchive = () =>
  downloadFile(
    `${API_BASE}/exports/archive`,
    `ninerlog-logbook-${new Date().toISOString().slice(0, 10)}.zip`,
  );

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
