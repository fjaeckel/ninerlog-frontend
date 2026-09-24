import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type {
  CustomReport,
  CustomReportDefinition,
  CustomReportInput,
  CustomReportResult,
} from '../lib/customReports';

export const CUSTOM_REPORTS_KEY = ['custom-reports'] as const;
export const CUSTOM_REPORTS_LIST_KEY = ['custom-reports', 'list'] as const;
export const CUSTOM_REPORT_RESULT_KEY = ['custom-reports', 'result'] as const;
export const CUSTOM_REPORT_PREVIEW_KEY = ['custom-reports', 'preview'] as const;
export const PREVIEW_DEBOUNCE_MS = 600;

/** Error carrying the API's `{ error }` message. */
function asError(error: unknown): Error {
  const message = (error as { error?: string } | undefined)?.error;
  return new Error(message || 'Request failed');
}

export const useCustomReports = () => {
  const { accessToken } = useAuthStore();
  return useQuery<CustomReport[]>({
    queryKey: CUSTOM_REPORTS_LIST_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/reports/custom');
      if (error) throw asError(error);
      return data;
    },
    enabled: !!accessToken,
  });
};

export const useCustomReportResult = (reportId: string) =>
  useQuery<CustomReportResult>({
    queryKey: [...CUSTOM_REPORT_RESULT_KEY, reportId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/reports/custom/{reportId}/result', {
        params: { path: { reportId } },
      });
      if (error) throw asError(error);
      return data;
    },
    retry: false,
  });

/** Value that settles `delayMs` after its last change. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Debounced evaluation of an unsaved definition; keeps the previous result while loading. */
export const useCustomReportPreview = (definition: CustomReportDefinition, enabled: boolean) => {
  const serialized = JSON.stringify(definition);
  const debounced = useDebounced(serialized, PREVIEW_DEBOUNCE_MS);
  const settled = debounced === serialized;
  return useQuery<CustomReportResult>({
    queryKey: [...CUSTOM_REPORT_PREVIEW_KEY, debounced],
    queryFn: async () => {
      const { data, error } = await apiClient.POST('/reports/custom/preview', {
        body: { definition: JSON.parse(debounced) as CustomReportDefinition },
      });
      if (error) throw asError(error);
      return data;
    },
    enabled: enabled && settled,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
};

export const useCreateCustomReport = () => {
  const qc = useQueryClient();
  return useMutation<CustomReport, Error, CustomReportInput>({
    mutationFn: async (body) => {
      const { data, error } = await apiClient.POST('/reports/custom', { body });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOM_REPORTS_LIST_KEY }),
  });
};

export const useUpdateCustomReport = () => {
  const qc = useQueryClient();
  return useMutation<CustomReport, Error, { id: string; input: CustomReportInput }>({
    mutationFn: async ({ id, input }) => {
      const { data, error } = await apiClient.PUT('/reports/custom/{reportId}', {
        params: { path: { reportId: id } },
        body: input,
      });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: CUSTOM_REPORTS_LIST_KEY });
      qc.invalidateQueries({ queryKey: [...CUSTOM_REPORT_RESULT_KEY, id] });
    },
  });
};

export const useDeleteCustomReport = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await apiClient.DELETE('/reports/custom/{reportId}', {
        params: { path: { reportId: id } },
      });
      if (error) throw asError(error);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: CUSTOM_REPORTS_LIST_KEY });
      qc.removeQueries({ queryKey: [...CUSTOM_REPORT_RESULT_KEY, id] });
    },
  });
};

/** Sets the display order; `reportIds` lists every report the user owns. */
export const useReorderCustomReports = () => {
  const qc = useQueryClient();
  return useMutation<CustomReport[], Error, string[]>({
    mutationFn: async (reportIds) => {
      const { data, error } = await apiClient.PUT('/reports/custom/order', { body: { reportIds } });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(CUSTOM_REPORTS_LIST_KEY, data);
      qc.invalidateQueries({ queryKey: CUSTOM_REPORTS_LIST_KEY });
    },
  });
};

export type CustomReportExportFormat = 'csv' | 'pdf';

/** Filename from a Content-Disposition header, if it names one. */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

function fallbackFilename(name: string, format: CustomReportExportFormat) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'report';
  return `ninerlog_${slug}_${new Date().toISOString().slice(0, 10)}.${format}`;
}

/** Downloads a saved report as CSV or PDF. */
export const useExportCustomReport = () =>
  useMutation<void, Error, { id: string; name: string; format: CustomReportExportFormat }>({
    mutationFn: async ({ id, name, format }) => {
      const { data, error, response } = await apiClient.GET('/reports/custom/{reportId}/export', {
        params: { path: { reportId: id }, query: { format } },
        parseAs: 'blob',
      });
      if (error || !data) throw asError(error);
      const blob = data as Blob;
      const filename =
        filenameFromDisposition(response.headers.get('Content-Disposition')) ?? fallbackFilename(name, format);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    },
  });
